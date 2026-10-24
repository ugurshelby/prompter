import { EFFORTS, MODEL_IDS, MODELS, SURFACE_INFO, type Effort, type ModelId } from '@shared/catalog'
import type { Analysis, AnalyzeRequest } from '@shared/types'
import { getSettings } from '../config'
import { generate, parseJson } from '../gemini'
import { card, surfaceCard } from './knowledge'

export const TASK_TYPES = [
  'agentic_coding',
  'debugging',
  'code_review',
  'code_question',
  'architecture_design',
  'frontend_design',
  'writing',
  'editing',
  'analysis',
  'research',
  'data_extraction',
  'brainstorming',
  'chat_qa',
  'system_prompt',
  'other'
] as const

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: {
      type: 'STRING',
      description: 'In Turkish, 1-2 sentences: what the person actually wants, stated precisely.'
    },
    task_type: { type: 'STRING', enum: [...TASK_TYPES] },
    complexity: { type: 'STRING', enum: ['trivial', 'moderate', 'complex', 'frontier'] },
    recommendation: {
      type: 'OBJECT',
      properties: {
        model: { type: 'STRING', enum: [...MODEL_IDS] },
        effort: { type: 'STRING', enum: [...EFFORTS] },
        confidence: { type: 'NUMBER', description: 'Between 0 and 1.', minimum: 0, maximum: 1 },
        reasoning: {
          type: 'STRING',
          description: 'In Turkish, 2-3 sentences: why this model and this effort fit this task better than the neighbors.'
        },
        factors: {
          type: 'ARRAY',
          description: 'In Turkish, 2-4 very short signals from the prompt that drove the choice (max ~6 words each).',
          items: { type: 'STRING' }
        }
      },
      required: ['model', 'effort', 'confidence', 'reasoning', 'factors'],
      propertyOrdering: ['factors', 'model', 'effort', 'confidence', 'reasoning']
    },
    alternatives: {
      type: 'ARRAY',
      description: '0-2 meaningful alternatives (e.g. cheaper/faster, or stronger). Never repeat the recommendation.',
      items: {
        type: 'OBJECT',
        properties: {
          model: { type: 'STRING', enum: [...MODEL_IDS] },
          effort: { type: 'STRING', enum: [...EFFORTS] },
          label: { type: 'STRING', description: 'In Turkish, 1-3 words, e.g. "Daha hızlı", "Daha güçlü".' },
          tradeoff: { type: 'STRING', description: 'In Turkish, one short sentence on what you gain and lose.' }
        },
        required: ['model', 'effort', 'label', 'tradeoff'],
        propertyOrdering: ['model', 'effort', 'label', 'tradeoff']
      }
    },
    questions: {
      type: 'ARRAY',
      description: '0-3 clarifying questions. Empty when the request is clear enough.',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          question: { type: 'STRING', description: 'In Turkish, short and concrete.' },
          why: { type: 'STRING', description: 'In Turkish, a few words: what in the prompt depends on the answer.' },
          options: {
            type: 'ARRAY',
            description: 'In Turkish, 2-4 concise likely answers.',
            items: { type: 'STRING' }
          }
        },
        required: ['id', 'question', 'why', 'options'],
        propertyOrdering: ['id', 'question', 'why', 'options']
      }
    }
  },
  required: ['intent', 'task_type', 'complexity', 'recommendation', 'alternatives', 'questions'],
  propertyOrdering: ['intent', 'task_type', 'complexity', 'questions', 'recommendation', 'alternatives']
}

function systemPrompt(req: AnalyzeRequest) {
  const manual = req.manual
    ? `\nThe person has already chosen ${MODELS[req.manual.model].name} at \`${req.manual.effort}\` effort and will use that. Still give your honest recommendation (it is shown only as a hint), but your main job here is the clarifying questions.\n`
    : ''
  return `You are the analysis stage of Prompter, a desktop tool that turns a person's raw request into an excellent prompt for a Claude model. You don't write the prompt; you decide which Claude model and effort level fit the request on the given surface, and what must be clarified first.

<vision>
${card('vision.md')}
</vision>

<models>
${card('models.md')}
</models>

<effort>
${card('effort.md')}
</effort>

<surface name="${SURFACE_INFO[req.surface].label}">
${surfaceCard(req.surface)}
</surface>

How to recommend:
- Judge the task the person describes, not the length of their message. A short message can describe a hard task.
- Pick the cheapest model + effort that will do this specific task reliably well on this surface. Opus 5.5 is the default for work that needs judgment; don't drift to Fable 5.1 unless the task is genuinely frontier-hard or very long-horizon, and don't drift to Haiku unless the task is simple or mechanical.
- Effort defaults differ by surface (Claude Code starts Sonnet 5.5 at medium; the API starts it at high). Recommend the level that fits the task, not the default.
- confidence reflects how clear-cut the choice is. Alternatives should be real options a thoughtful engineer would consider, each with an honest trade-off.

How to ask:
- The person prefers to answer a few questions before the prompt is written, but only questions that matter. Ask when the answer would materially change the prompt (scope, target, acceptance criteria, constraints, audience, output form) and can't be reasonably inferred.
- At most 3. Return none when the request is already clear.
- Never ask about the model or effort, or about things the target model can discover itself (in Claude Code it can read the repository, run commands and look at files).
- Each question gets 2-4 short answer options covering the likely answers; the person can also type their own.
${manual}
Language: every human-readable field is in Turkish. Keep model names, effort names and technical terms as they are.`
}

function userPrompt(req: AnalyzeRequest) {
  return `<surface>${SURFACE_INFO[req.surface].label}</surface>

<raw_prompt>
${req.prompt}
</raw_prompt>`
}

interface RawAnalysis {
  intent: string
  task_type: string
  complexity: Analysis['complexity']
  recommendation: { model: string; effort: string; confidence: number; reasoning: string; factors: string[] }
  alternatives: { model: string; effort: string; label: string; tradeoff: string }[]
  questions: { id: string; question: string; why: string; options: string[] }[]
}

const isModel = (m: string): m is ModelId => (MODEL_IDS as readonly string[]).includes(m)
const isEffort = (e: string): e is Effort => (EFFORTS as readonly string[]).includes(e)

function normalize(raw: RawAnalysis): Analysis {
  const rec = raw.recommendation ?? ({} as RawAnalysis['recommendation'])
  const model: ModelId = isModel(rec.model) ? rec.model : 'claude-opus-5-5'
  const effort: Effort = isEffort(rec.effort) ? rec.effort : 'medium'
  const confidence = rec.confidence > 1 ? rec.confidence / 10 : rec.confidence
  return {
    intent: raw.intent ?? '',
    taskType: raw.task_type ?? 'other',
    complexity: raw.complexity ?? 'moderate',
    recommendation: {
      model,
      effort,
      confidence: Math.min(1, Math.max(0, Number.isFinite(confidence) ? confidence : 0.7)),
      reasoning: rec.reasoning ?? '',
      factors: (rec.factors ?? []).slice(0, 4)
    },
    alternatives: (raw.alternatives ?? [])
      .filter((a) => isModel(a.model) && isEffort(a.effort) && !(a.model === model && a.effort === effort))
      .slice(0, 2) as Analysis['alternatives'],
    questions: (raw.questions ?? [])
      .filter((q) => q.question)
      .slice(0, 3)
      .map((q, i) => ({ id: q.id || `q${i + 1}`, question: q.question, why: q.why ?? '', options: (q.options ?? []).slice(0, 4) }))
  }
}

export async function analyze(req: AnalyzeRequest): Promise<Analysis> {
  const started = Date.now()
  const call = {
    model: getSettings().analysisModel,
    system: systemPrompt(req),
    user: userPrompt(req),
    schema: SCHEMA,
    temperature: 0.3
  }
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, usage } = await generate(call)
    try {
      return { ...normalize(parseJson<RawAnalysis>(text)), usage, elapsedMs: Date.now() - started }
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
