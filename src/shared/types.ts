import type { Effort, ModelId, Surface } from './catalog'

export interface Question {
  id: string
  question: string
  why: string
  options: string[]
}

export interface Alternative {
  model: ModelId
  effort: Effort
  label: string
  tradeoff: string
}

export interface Analysis {
  intent: string
  taskType: string
  complexity: 'trivial' | 'moderate' | 'complex' | 'frontier'
  recommendation: {
    model: ModelId
    effort: Effort
    confidence: number
    reasoning: string
    factors: string[]
  }
  alternatives: Alternative[]
  questions: Question[]
  usage?: Usage
  elapsedMs?: number
  /** Analizin kaydedildiği geçmiş girdisi; yazımlar bu girdiye eklenir. */
  historyId?: string
}

export interface Usage {
  promptTokens: number
  outputTokens: number
  thoughtsTokens: number
}

export interface AnalyzeRequest {
  prompt: string
  surface: Surface
  /** Elle seçim yapıldıysa analiz yalnızca soruları üretir, öneri bilgi amaçlı kalır. */
  manual?: { model: ModelId; effort: Effort }
}

export interface Answer {
  question: string
  answer: string
}

export interface GenerateRequest {
  id: string
  prompt: string
  surface: Surface
  model: ModelId
  effort: Effort
  answers: Answer[]
  analysis?: Pick<Analysis, 'intent' | 'taskType' | 'complexity'>
  historyId?: string
}

export interface GenerateResult {
  prompt: string
  notes: string[]
  usage?: Usage
  elapsedMs: number
}

export interface HistoryOutput extends GenerateResult {
  id: string
  model: ModelId
  effort: Effort
  createdAt: number
}

export interface HistoryEntry {
  id: string
  createdAt: number
  updatedAt: number
  prompt: string
  surface: Surface
  analysis: Analysis
  answers: Answer[]
  /** Eskiden yeniye; sonuncusu en güncel yazım. */
  outputs: HistoryOutput[]
}

export type ReplyLanguage = 'tr' | 'en' | 'none'

export interface Settings {
  analysisModel: string
  generationModel: string
  replyLanguage: ReplyLanguage
  defaultSurface: Surface
  alwaysOnTop: boolean
  hotkey: string
  launchAtLogin: boolean
}

export interface SettingsView extends Settings {
  key: { present: boolean; source: 'saved' | 'env' | 'none' }
  project: string
  location: string
}

export type WindowMode = 'pill' | 'panel'

export type StreamEvent =
  | { id: string; type: 'chunk'; text: string }
  | { id: string; type: 'done'; result: GenerateResult }
  | { id: string; type: 'error'; message: string }
