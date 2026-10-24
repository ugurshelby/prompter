// Geçmiş: her analiz bir girdi açar, o analizden yapılan her yazım girdiye eklenir.
// userData/history.json içinde, en yeni en üstte, en fazla LIMIT girdi.

import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Analysis, AnalyzeRequest, GenerateRequest, GenerateResult, HistoryEntry } from '@shared/types'

const LIMIT = 200
const file = () => join(app.getPath('userData'), 'history.json')

let entries: HistoryEntry[] | null = null

function load(): HistoryEntry[] {
  if (entries) return entries
  try {
    entries = JSON.parse(readFileSync(file(), 'utf8'))
  } catch {
    entries = []
  }
  return entries!
}

function persist() {
  const list = load()
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  list.splice(LIMIT)
  mkdirSync(app.getPath('userData'), { recursive: true })
  // Yarım yazılmış dosya kalmasın diye önce geçici dosyaya yaz.
  const tmp = `${file()}.tmp`
  writeFileSync(tmp, JSON.stringify(list))
  renameSync(tmp, file())
}

export function listHistory(): HistoryEntry[] {
  return [...load()].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function recordAnalysis(req: AnalyzeRequest, analysis: Analysis): string {
  const now = Date.now()
  const entry: HistoryEntry = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    prompt: req.prompt,
    surface: req.surface,
    analysis,
    answers: [],
    outputs: []
  }
  load().push(entry)
  persist()
  return entry.id
}

export function recordOutput(req: GenerateRequest, result: GenerateResult) {
  const now = Date.now()
  let entry = req.historyId ? load().find((e) => e.id === req.historyId) : undefined
  if (!entry) {
    // Analizi silinmiş ya da hiç kaydedilmemiş bir yazım: kendi girdisini açar.
    entry = {
      id: req.historyId ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
      prompt: req.prompt,
      surface: req.surface,
      analysis: {
        intent: req.analysis?.intent ?? '',
        taskType: req.analysis?.taskType ?? 'other',
        complexity: req.analysis?.complexity ?? 'moderate',
        recommendation: { model: req.model, effort: req.effort, confidence: 0, reasoning: '', factors: [] },
        alternatives: [],
        questions: []
      },
      answers: [],
      outputs: []
    }
    load().push(entry)
  }
  entry.answers = req.answers
  entry.outputs.push({ ...result, id: randomUUID(), model: req.model, effort: req.effort, createdAt: now })
  entry.updatedAt = now
  persist()
}

export function deleteHistory(id: string) {
  entries = load().filter((e) => e.id !== id)
  persist()
}

export function clearHistory() {
  entries = []
  persist()
}
