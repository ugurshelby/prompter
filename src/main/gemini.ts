// Vertex AI üzerinden Gemini istemcisi (bkz. docs/vertex-ai-gemini-kurulumu.md).
// Düz HTTPS + JSON; key yalnızca bu süreçte kullanılır.

import type { Usage } from '@shared/types'
import { getVertexConfig } from './config'

export interface GeminiCall {
  model: string
  system: string
  user: string
  schema?: object
  temperature?: number
  signal?: AbortSignal
  timeoutMs?: number
}

export interface GeminiResult {
  text: string
  usage: Usage
}

export class GeminiError extends Error {}

function endpoint(model: string, stream: boolean) {
  const { project, location } = getVertexConfig()
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`
  const method = stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
  return `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:${method}`
}

function body(call: GeminiCall) {
  return {
    systemInstruction: { parts: [{ text: call.system }] },
    contents: [{ role: 'user', parts: [{ text: call.user }] }],
    generationConfig: {
      temperature: call.temperature ?? 0.7,
      topP: 0.95,
      maxOutputTokens: 32768,
      responseMimeType: call.schema ? 'application/json' : 'text/plain',
      ...(call.schema ? { responseSchema: call.schema } : {})
    }
  }
}

function usageOf(meta: any): Usage {
  return {
    promptTokens: meta?.promptTokenCount ?? 0,
    outputTokens: meta?.candidatesTokenCount ?? 0,
    thoughtsTokens: meta?.thoughtsTokenCount ?? 0
  }
}

function textOf(candidate: any): string {
  return (candidate?.content?.parts ?? [])
    .filter((p: any) => typeof p.text === 'string' && !p.thought)
    .map((p: any) => p.text)
    .join('')
}

function friendly(status: number, message: string): string {
  if (status === 404) return `Model bulunamadı ya da erişim yok (404). Ayarlardaki model ID'sini kontrol et. ${message}`
  if (status === 401 || status === 403) return `API key reddedildi (${status}). Ayarlardan key'i kontrol et.`
  if (status === 429) return 'Vertex kotası doldu (429). Biraz sonra tekrar dene.'
  return `Vertex ${status}: ${message}`
}

async function post(call: GeminiCall, stream: boolean): Promise<Response> {
  const { key } = getVertexConfig()
  if (!key) throw new GeminiError('Vertex API key bulunamadı. Ayarlardan ekle ya da .env dosyasına VERTEX_API_KEY yaz.')

  for (let attempt = 0; attempt < 3; attempt++) {
    const signals = [AbortSignal.timeout(call.timeoutMs ?? 240_000)]
    if (call.signal) signals.push(call.signal)
    let res: Response
    try {
      res = await fetch(endpoint(call.model, stream), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body(call)),
        signal: AbortSignal.any(signals)
      })
    } catch (e: any) {
      if (call.signal?.aborted) throw new GeminiError('İptal edildi.')
      if (e?.name === 'TimeoutError') throw new GeminiError('İstek zaman aşımına uğradı.')
      throw new GeminiError(`Ağ hatası: ${e?.message ?? e}`)
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1) ** 2))
      continue
    }
    if (!res.ok) {
      const data: any = await res.json().catch(() => ({}))
      throw new GeminiError(friendly(res.status, data?.error?.message ?? res.statusText))
    }
    return res
  }
  throw new GeminiError('Vertex: tekrar denemeleri tükendi.')
}

export async function generate(call: GeminiCall): Promise<GeminiResult> {
  const res = await post(call, false)
  const data: any = await res.json()
  const cand = data.candidates?.[0]
  if (cand?.finishReason === 'MAX_TOKENS') throw new GeminiError('Yanıt token sınırında kesildi.')
  const text = textOf(cand).trim()
  if (!text) throw new GeminiError(`Boş yanıt (${cand?.finishReason ?? data?.promptFeedback?.blockReason ?? 'bilinmiyor'}).`)
  return { text, usage: usageOf(data.usageMetadata) }
}

export async function stream(call: GeminiCall, onText: (chunk: string) => void): Promise<GeminiResult> {
  const res = await post(call, true)
  if (!res.body) throw new GeminiError('Akış gövdesi yok.')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let usage: Usage = { promptTokens: 0, outputTokens: 0, thoughtsTokens: 0 }
  let finish: string | undefined

  const handle = (line: string) => {
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (!payload) return
    const data = JSON.parse(payload)
    const cand = data.candidates?.[0]
    const piece = textOf(cand)
    if (piece) {
      text += piece
      onText(piece)
    }
    if (cand?.finishReason) finish = cand.finishReason
    if (data.usageMetadata) usage = usageOf(data.usageMetadata)
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      lines.forEach(handle)
    }
    if (buffer) handle(buffer)
  } catch (e: any) {
    if (call.signal?.aborted) throw new GeminiError('İptal edildi.')
    throw e
  }

  if (finish === 'MAX_TOKENS') throw new GeminiError('Yanıt token sınırında kesildi.')
  if (!text.trim()) throw new GeminiError(`Boş yanıt (${finish ?? 'bilinmiyor'}).`)
  return { text, usage }
}

/** JSON yanıtı savunmalı ayrıştırır: kod bloğu işaretlerini temizler, ilk { ile son } arasını alır. */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < start) throw new GeminiError('Geçerli JSON bulunamadı.')
  return JSON.parse(cleaned.slice(start, end + 1)) as T
}
