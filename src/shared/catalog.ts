// Hedef modeller, effort seviyeleri ve yüzeyler. Ana süreç ve arayüz aynı listeyi kullanır.

export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type Effort = (typeof EFFORTS)[number]

export const MODEL_IDS = [
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-haiku-5-5'
] as const
export type ModelId = (typeof MODEL_IDS)[number]

export const SURFACES = ['claude-code', 'chat', 'api'] as const
export type Surface = (typeof SURFACES)[number]

export interface TargetModel {
  id: ModelId
  name: string
  short: string
  tagline: string
  latency: string
  price: { input: number; output: number }
  defaultEffort: { api: Effort; claudeCode: Effort }
  hue: string
}

export const MODELS: Record<ModelId, TargetModel> = {
  'claude-fable-5-1': {
    id: 'claude-fable-5-1',
    name: 'Claude Fable 5.1',
    short: 'Fable 5.1',
    tagline: 'En zor ve en uzun soluklu işler',
    latency: 'Yavaş',
    price: { input: 10, output: 50 },
    defaultEffort: { api: 'high', claudeCode: 'high' },
    hue: '#f78fb3'
  },
  'claude-opus-5-5': {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    short: 'Opus 5.5',
    tagline: 'Ciddi işlerin çoğu için başlangıç noktası',
    latency: 'Orta',
    price: { input: 4, output: 20 },
    defaultEffort: { api: 'medium', claudeCode: 'medium' },
    hue: '#ff9a5a'
  },
  'claude-sonnet-5-5': {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    short: 'Sonnet 5.5',
    tagline: 'Hız ve zekânın en iyi dengesi',
    latency: 'Hızlı',
    price: { input: 2, output: 10 },
    defaultEffort: { api: 'high', claudeCode: 'medium' },
    hue: '#6cc9ff'
  },
  'claude-haiku-5-5': {
    id: 'claude-haiku-5-5',
    name: 'Claude Haiku 5.5',
    short: 'Haiku 5.5',
    tagline: 'Hızlı, ucuz, yüksek hacim',
    latency: 'En hızlı',
    price: { input: 0.1, output: 0.5 },
    defaultEffort: { api: 'medium', claudeCode: 'medium' },
    hue: '#8be28f'
  }
}

export const EFFORT_INFO: Record<Effort, { label: string; hint: string }> = {
  low: { label: 'Low', hint: 'Hızlı, dar kapsam' },
  medium: { label: 'Medium', hint: 'Günlük, net kapsamlı iş' },
  high: { label: 'High', hint: 'Doğrulama ve uç durumlar' },
  xhigh: { label: 'xHigh', hint: 'Uzun soluklu agentic iş' },
  max: { label: 'Max', hint: 'Sınır problemleri' }
}

export const SURFACE_INFO: Record<Surface, { label: string; hint: string }> = {
  'claude-code': { label: 'Claude Code', hint: 'Repo içinde agentic kodlama' },
  chat: { label: 'Sohbet', hint: 'claude.ai / Desktop' },
  api: { label: 'API', hint: 'System prompt' }
}

export function defaultEffortFor(model: ModelId, surface: Surface): Effort {
  const d = MODELS[model].defaultEffort
  return surface === 'api' ? d.api : d.claudeCode
}

/** Kopyalanan promptun yanında gösterilecek "hedef araçta böyle ayarla" notu. */
export function setupNote(model: ModelId, effort: Effort, surface: Surface): { title: string; lines: string[]; code?: string } {
  const m = MODELS[model]
  if (surface === 'claude-code') {
    return {
      title: 'Claude Code ayarı',
      lines: [
        effort === 'max' ? '`max` yalnızca bu oturum için geçerli olur.' : 'Seviye bir sonraki oturumlar için de kaydedilir.'
      ],
      code: `/model ${m.id}\n/effort ${effort}`
    }
  }
  if (surface === 'chat') {
    return {
      title: 'Sohbet ayarı',
      lines: [
        `Model seçiciden ${m.name} modelini seç.`,
        `Uygulamada düşünme/effort ayarı varsa ${EFFORT_INFO[effort].label} yap; yoksa varsayılan (${m.defaultEffort.api}) kullanılır.`
      ]
    }
  }
  const maxTokens = effort === 'xhigh' || effort === 'max' ? 64000 : effort === 'high' ? 32000 : 16000
  return {
    title: 'API isteği',
    lines: ['Prompt `system` alanına girer. `max_tokens` düşünme + yanıtı birlikte kapsar.'],
    code: JSON.stringify(
      { model: m.id, max_tokens: maxTokens, output_config: { effort }, system: '<prompt>', messages: [] },
      null,
      2
    )
  }
}
