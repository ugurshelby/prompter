// Electron dışında, tarayıcıda arayüz geliştirmek için sahte köprü. Üretimde kullanılmaz.
import type { PrompterApi } from '../../preload/api'
import type { Effort, ModelId } from '@shared/catalog'
import type { Analysis, HistoryEntry, SettingsView, StreamEvent, WindowMode } from '@shared/types'

const SAMPLE = `<prompt>
I'm building Prompter, an Electron desktop widget that rewrites raw prompts for Claude models. The settings sheet needs a connection test that tells the user, within a few seconds, whether their Vertex AI key works.

Add a "Test connection" button to src/renderer/src/components/Settings.tsx that calls a new IPC handler in src/main/index.ts. The handler should send a minimal request to the configured analysis model and return { ok, ms, message }.

Requirements:
- Never send the API key to the renderer; it stays in the main process.
- Show the elapsed time on success and the Vertex error message on failure.
- Time out after 60 seconds.

When the change is done, run npm run typecheck and fix any errors before reporting back. Don't add tests or refactor unrelated code; if something else looks worth changing, mention it at the end. Write your messages to me in Turkish; keep code and identifiers as they are.
</prompt>
<notes>
- Hedef dosyalar ve IPC sınırı netleştirildi; key'in arayüze inmemesi gerekçesiyle yazıldı.
- medium effort için doğrulama adımı (typecheck) açıkça eklendi.
- Kapsam paragrafı eklendi: Sonnet istenmeyen test/refactor ekleme eğiliminde.
</notes>`

const ANALYSIS: Analysis = {
  intent: 'Ayarlar paneline Vertex bağlantısını test eden bir buton eklenmesini istiyorsun; key arayüze inmemeli.',
  taskType: 'agentic_coding',
  complexity: 'moderate',
  recommendation: {
    model: 'claude-sonnet-5-5',
    effort: 'medium',
    confidence: 0.82,
    reasoning:
      'Kapsamı net, birkaç dosyaya dokunan bir özellik. Sonnet 5.5 medium bu tür iyi tanımlı işleri hızlı ve ucuza bitirir; Opus burada fazla kalır.',
    factors: ['İyi tanımlı özellik', '2–3 dosya', 'Net doğrulama']
  },
  alternatives: [
    { model: 'claude-opus-5-5', effort: 'medium', label: 'Daha güçlü', tradeoff: 'IPC tasarımında daha titiz, ama iki kat pahalı.' },
    { model: 'claude-haiku-5-5', effort: 'medium', label: 'Daha ucuz', tradeoff: 'Çok hızlı ama çok dosyalı işte adım atlayabilir.' }
  ],
  questions: [
    {
      id: 'q1',
      question: 'Test sonucu nerede görünsün?',
      why: 'Arayüz metni buna göre yazılacak',
      options: ['Butonun altında', 'Bildirim olarak', 'Durum rozetinde']
    },
    { id: 'q2', question: 'Hata olursa ne olsun?', why: 'Hata akışı', options: ['Mesajı göster', 'Tekrar dene butonu'] }
  ],
  elapsedMs: 2400
}

let settings: SettingsView = {
  analysisModel: 'gemini-4-argon',
  generationModel: 'gemini-4-argon',
  replyLanguage: 'tr',
  defaultSurface: 'claude-code',
  alwaysOnTop: true,
  hotkey: 'CommandOrControl+Shift+Space',
  launchAtLogin: false,
  key: { present: true, source: 'env' },
  project: 'the-curate',
  location: 'global'
}

const SAMPLE_PROMPT = SAMPLE.split('<prompt>')[1].split('</prompt>')[0].trim()
const SAMPLE_NOTES = SAMPLE.split('<notes>')[1].split('</notes>')[0].trim().split('\n').map((l) => l.slice(2))

function seedHistory(): HistoryEntry[] {
  const now = Date.now()
  const output = (model: ModelId, effort: Effort, minutesAgo: number) => ({
    id: crypto.randomUUID(),
    model,
    effort,
    createdAt: now - minutesAgo * 60_000,
    prompt: SAMPLE_PROMPT,
    notes: SAMPLE_NOTES,
    elapsedMs: 9100
  })
  return [
    {
      id: 'h1',
      createdAt: now - 6 * 60_000,
      updatedAt: now - 5 * 60_000,
      prompt: 'ayarlar paneline vertex bağlantısını test eden bir buton ekle, key arayüze inmesin, hata olursa mesajı göster',
      surface: 'claude-code',
      analysis: ANALYSIS,
      answers: [{ question: ANALYSIS.questions[0].question, answer: 'Butonun altında' }],
      outputs: [output('claude-sonnet-5-5', 'medium', 6), output('claude-opus-5-5', 'medium', 5)]
    },
    {
      id: 'h2',
      createdAt: now - 3 * 3600_000,
      updatedAt: now - 3 * 3600_000,
      prompt: 'müşteri destek e-postalarını iade, kargo, teknik sorun ve diğer olarak sınıflandıran system prompt',
      surface: 'api',
      analysis: { ...ANALYSIS, recommendation: { ...ANALYSIS.recommendation, model: 'claude-haiku-5-5', effort: 'low' } },
      answers: [],
      outputs: [output('claude-haiku-5-5', 'low', 180)]
    },
    {
      id: 'h3',
      createdAt: now - 26 * 3600_000,
      updatedAt: now - 26 * 3600_000,
      prompt: 'bu repo için mimari bir inceleme yap, zayıf noktaları ve önceliklendirilmiş bir iyileştirme planı çıkar',
      surface: 'claude-code',
      analysis: { ...ANALYSIS, recommendation: { ...ANALYSIS.recommendation, model: 'claude-opus-5-5', effort: 'high' } },
      answers: [],
      outputs: []
    }
  ]
}

export function installMock() {
  let history = location.hash.includes('empty') ? [] : seedHistory()
  const streamListeners = new Set<(ev: StreamEvent) => void>()
  const modeListeners = new Set<(m: WindowMode) => void>()
  const timers = new Map<string, number>()
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const api: PrompterApi = {
    settings: {
      get: async () => settings,
      set: async (patch) => (settings = { ...settings, ...patch }),
      saveKey: async () => (settings = { ...settings, key: { present: true, source: 'saved' } }),
      clearKey: async () => (settings = { ...settings, key: { present: true, source: 'env' } }),
      test: async () => (await wait(900), { ok: true, ms: 900 }),
      openKnowledge: async () => ''
    },
    engine: {
      analyze: async (req) => {
        await wait(location.hash.includes('slow') ? 60000 : 2600)
        const id = crypto.randomUUID()
        const now = Date.now()
        history.unshift({ id, createdAt: now, updatedAt: now, prompt: req.prompt, surface: req.surface, analysis: ANALYSIS, answers: [], outputs: [] })
        return { ...ANALYSIS, historyId: id }
      },
      generate: async (req) => {
        let i = 0
        const t = window.setInterval(() => {
          const chunk = SAMPLE.slice(i, i + 14)
          i += 14
          if (chunk) streamListeners.forEach((l) => l({ id: req.id, type: 'chunk', text: chunk }))
          else {
            clearInterval(t)
            const result = { prompt: SAMPLE_PROMPT, notes: SAMPLE_NOTES, elapsedMs: 4200, usage: { promptTokens: 9000, outputTokens: 420, thoughtsTokens: 0 } }
            const entry = history.find((e) => e.id === req.historyId)
            if (entry) {
              entry.outputs.push({ ...result, id: crypto.randomUUID(), model: req.model, effort: req.effort, createdAt: Date.now() })
              entry.answers = req.answers
              entry.updatedAt = Date.now()
              history = [entry, ...history.filter((e) => e !== entry)]
            }
            streamListeners.forEach((l) => l({ id: req.id, type: 'done', result }))
          }
        }, 28)
        timers.set(req.id, t)
      },
      cancel: async (id) => clearInterval(timers.get(id)),
      onStream: (cb) => (streamListeners.add(cb), () => streamListeners.delete(cb))
    },
    history: {
      list: async () => structuredClone(history),
      remove: async (id) => void (history = history.filter((e) => e.id !== id)),
      clear: async () => void (history = [])
    },
    window: {
      getState: async () => ({ mode: 'panel', pinned: settings.alwaysOnTop }),
      setMode: async (m) => modeListeners.forEach((l) => l(m)),
      togglePin: async () => (settings = { ...settings, alwaysOnTop: !settings.alwaysOnTop }).alwaysOnTop,
      hide: async () => {},
      quit: async () => {},
      dragStart: () => {},
      dragMove: () => {},
      dragEnd: () => {},
      onMode: (cb) => (modeListeners.add(cb), () => modeListeners.delete(cb)),
      onPinned: () => () => {}
    },
    clipboard: { write: async (t) => navigator.clipboard?.writeText(t).catch(() => {}) },
    platform: 'win32'
  }
  ;(window as any).prompter = api
}
