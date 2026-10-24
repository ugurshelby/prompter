import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  Wand2,
  X
} from 'lucide-react'
import { MODELS, SURFACE_INFO, SURFACES, defaultEffortFor, setupNote, type Surface } from '@shared/catalog'
import { parseGenerated } from '@shared/parse'
import type { Choice, FlowState, useFlow } from '../flow'
import { EffortPicker, Meter, ModelPicker, Segment } from './Pickers'
import { PrismLoader } from './Prism'

type Flow = ReturnType<typeof useFlow>

const isMac = window.prompter.platform === 'darwin'
const MOD = isMac ? '⌘' : 'Ctrl'

export const viewMotion = {
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(6px)' },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const }
}

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.06 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
})

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div className="error" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
      <AlertTriangle size={16} style={{ flex: 'none', marginTop: 1 }} />
      <span>{message}</span>
    </motion.div>
  )
}

function useCtrlEnter(fn: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fn, enabled])
}

const surfaceOptions = SURFACES.map((v) => ({ value: v, label: SURFACE_INFO[v].label }))

// ---------------------------------------------------------------- Compose

export function Compose({ flow }: { flow: Flow }) {
  const { s, patch, start } = flow
  const words = s.prompt.trim() ? s.prompt.trim().split(/\s+/).length : 0
  useCtrlEnter(start, !!s.prompt.trim())

  return (
    <motion.div className="view" {...viewMotion}>
      <motion.div {...stagger(0)}>
        <Segment<Surface> id="surface" value={s.surface} options={surfaceOptions} onChange={(v) => patch({ surface: v })} />
      </motion.div>

      <motion.div className="composer" {...stagger(1)}>
        <textarea
          autoFocus
          value={s.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
          placeholder={'Ne yaptırmak istiyorsun? Aklındakini olduğu gibi yaz.\nSıralı olması, İngilizce olması gerekmiyor.'}
        />
        <span className="meta">{words ? `${words} kelime` : SURFACE_INFO[s.surface].hint}</span>
      </motion.div>

      <motion.div className="row between" {...stagger(2)}>
        <span className="label">Model ve effort</span>
        <div style={{ width: 210 }}>
          <Segment
            id="select-mode"
            value={s.selectMode}
            options={[
              { value: 'auto', label: '✦ Önerilsin' },
              { value: 'manual', label: 'Ben seçeyim' }
            ]}
            onChange={(v) => patch({ selectMode: v })}
          />
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {s.selectMode === 'manual' && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', flex: 'none' }}
          >
            <ModelPicker value={s.manual.model} onChange={(model) => patch({ manual: { ...s.manual, model } })} />
            <EffortPicker
              value={s.manual.effort}
              defaultEffort={defaultEffortFor(s.manual.model, s.surface)}
              onChange={(effort) => patch({ manual: { ...s.manual, effort } })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {s.error && <ErrorBox message={s.error} />}

      <motion.button className="cta sticky" disabled={!s.prompt.trim()} onClick={start} {...stagger(3)}>
        {s.selectMode === 'auto' ? <Sparkles size={17} /> : <Wand2 size={17} />}
        {s.selectMode === 'auto' ? 'Analiz et ve öner' : 'Promptu hazırla'}
        <span className="kbd">{MOD} ↵</span>
      </motion.button>
    </motion.div>
  )
}

// ---------------------------------------------------------------- Analyzing

const STATUS = [
  'Niyetini çözümlüyorum…',
  'Görevin zorluğunu tartıyorum…',
  'Model kartlarını karşılaştırıyorum…',
  'Effort dengesini hesaplıyorum…',
  'Belirsiz noktaları ayıklıyorum…',
  'Son kontrol…'
]

function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  return Math.max(0, Math.floor((now - since) / 1000))
}

export function Analyzing({ flow }: { flow: Flow }) {
  const { s, cancel } = flow
  const elapsed = useElapsed(s.startedAt)
  const status = STATUS[Math.min(STATUS.length - 1, Math.floor(elapsed / 3))]

  return (
    <motion.div className="view centered" {...viewMotion} style={{ gap: 18 }}>
      <div className="quote">“{s.prompt.trim()}”</div>
      <PrismLoader />
      <div className="status-line">
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {status}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="elapsed">{elapsed} sn</div>
      <button className="ghost" onClick={cancel}>
        <X size={15} /> Vazgeç
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------- Review

const TASK_LABEL: Record<string, string> = {
  agentic_coding: 'Agentic kodlama',
  debugging: 'Hata ayıklama',
  code_review: 'Kod inceleme',
  code_question: 'Kod sorusu',
  architecture_design: 'Mimari / tasarım',
  frontend_design: 'Arayüz tasarımı',
  writing: 'Yazım',
  editing: 'Düzenleme',
  analysis: 'Analiz',
  research: 'Araştırma',
  data_extraction: 'Veri çıkarma',
  brainstorming: 'Beyin fırtınası',
  chat_qa: 'Soru-cevap',
  system_prompt: 'System prompt',
  other: 'Diğer'
}
const COMPLEXITY_LABEL = { trivial: 'Basit', moderate: 'Orta', complex: 'Karmaşık', frontier: 'Sınırda' }

export function Review({ flow }: { flow: Flow }) {
  const { s, patch, write, answer, reset } = flow
  const a = s.analysis!
  const choice = s.choice ?? { model: a.recommendation.model, effort: a.recommendation.effort }
  const rec = a.recommendation
  const isRec = choice.model === rec.model && choice.effort === rec.effort
  const manual = s.selectMode === 'manual'
  const [editing, setEditing] = useState(false)
  const m = MODELS[choice.model]
  const choose = (c: Choice) => patch({ choice: c })
  useCtrlEnter(() => write())

  return (
    <motion.div className="view" {...viewMotion} style={{ '--hue': m.hue } as CSSProperties}>
      <motion.div className="intent" {...stagger(0)}>
        <b>Anladığım:</b> {a.intent}
      </motion.div>
      <motion.div className="chips" {...stagger(1)}>
        <span className="chip">{TASK_LABEL[a.taskType] ?? a.taskType}</span>
        <span className="chip">{COMPLEXITY_LABEL[a.complexity]}</span>
        <span className="chip">{SURFACE_INFO[s.surface].label}</span>
      </motion.div>

      <motion.div className="rec" layout {...stagger(2)}>
        <div className="kicker">
          {isRec ? <Sparkles size={12} /> : <SlidersHorizontal size={12} />}
          {isRec ? 'Önerim' : 'Senin seçimin'}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={choice.model}
            className="model"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
          >
            {m.name}
          </motion.div>
        </AnimatePresence>
        <div className="effort-badge">
          <Meter key={choice.effort} effort={choice.effort} />
          <span>
            effort <b style={{ color: 'var(--text)' }}>{choice.effort}</b>
          </span>
        </div>
        {isRec && (
          <>
            <div className="conf">
              <strong>%{Math.round(rec.confidence * 100)}</strong>eminlik
            </div>
            <p className="reason">{rec.reasoning}</p>
            {rec.factors.length > 0 && (
              <div className="factors">
                {rec.factors.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
            )}
          </>
        )}
        {!isRec && (
          <p className="reason">
            {manual ? 'Benim önerim' : 'Önerim'}: {MODELS[rec.model].short} · {rec.effort}.{' '}
            <button className="link" style={{ display: 'inline' }} onClick={() => choose({ model: rec.model, effort: rec.effort })}>
              <Undo2 size={12} style={{ verticalAlign: -2 }} /> Öneriye geç
            </button>
            <br />
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{rec.reasoning}</span>
          </p>
        )}
      </motion.div>

      {a.alternatives.length > 0 && !editing && (
        <motion.div className="alts" {...stagger(3)}>
          {a.alternatives
            .filter((alt) => !(alt.model === choice.model && alt.effort === choice.effort))
            .map((alt) => (
              <button
                key={`${alt.model}-${alt.effort}`}
                className="alt"
                style={{ '--hue': MODELS[alt.model].hue } as CSSProperties}
                onClick={() => choose({ model: alt.model, effort: alt.effort })}
              >
                <span className="dot" />
                <span>
                  <div className="t">
                    {alt.label} · {MODELS[alt.model].short} · {alt.effort}
                  </div>
                  <div className="d">{alt.tradeoff}</div>
                </span>
              </button>
            ))}
        </motion.div>
      )}

      <motion.div {...stagger(4)}>
        <button className="link" onClick={() => setEditing((v) => !v)}>
          <SlidersHorizontal size={13} /> {editing ? 'Seçiciyi kapat' : 'Model veya effort’u değiştir'}
        </button>
      </motion.div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', flex: 'none' }}
          >
            <ModelPicker value={choice.model} onChange={(model) => choose({ ...choice, model })} />
            <EffortPicker
              value={choice.effort}
              defaultEffort={defaultEffortFor(choice.model, s.surface)}
              onChange={(effort) => choose({ ...choice, effort })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {a.questions.length > 0 && (
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} {...stagger(5)}>
          <span className="label">Önce birkaç soru</span>
          {a.questions.map((q, i) => (
            <motion.div key={q.id} className="question" {...stagger(6 + i)}>
              <div className="q">
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                {q.question}
              </div>
              {q.why && <div className="why">{q.why}</div>}
              <div className="options">
                {q.options.map((o) => (
                  <button
                    key={o}
                    className={`option ${s.answers[q.id]?.option === o ? 'on' : ''}`}
                    onClick={() => answer(q.id, { option: o })}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <input
                className="free"
                placeholder="Kendi cevabım…"
                value={s.answers[q.id]?.text ?? ''}
                onChange={(e) => answer(q.id, { text: e.target.value })}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {s.error && <ErrorBox message={s.error} />}

      <div style={{ flex: 1 }} />
      <motion.div className="row sticky" {...stagger(8)}>
        <button className="ghost" onClick={reset} title="Baştan başla">
          <ArrowLeft size={15} />
        </button>
        <button className="cta" style={{ flex: 1 }} onClick={() => write()}>
          <Wand2 size={17} />
          {isRec ? 'Kabul et ve yaz' : 'Bu ayarla yaz'}
          <span className="kbd">{MOD} ↵</span>
        </button>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------- Generating / Result

function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[[') ? (
          <span key={i} className="ph">
            {p}
          </span>
        ) : (
          p
        )
      )}
    </>
  )
}

function Sparks({ burst }: { burst: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4
        const dist = 38 + Math.random() * 36
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.6, c: ['#4fe3c1', '#ffd36e', '#ff8a4c', '#6cc9ff'][i % 4] }
      }),
    [burst]
  )
  if (!burst) return null
  return (
    <>
      {sparks.map((p, i) => (
        <motion.span
          key={`${burst}-${i}`}
          className="spark"
          style={{ background: p.c }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      ))}
    </>
  )
}

function CopyMini({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="icon-btn"
      title="Kopyala"
      onClick={async () => {
        await window.prompter.clipboard.write(text)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? <Check size={14} className="ok-text" /> : <Copy size={14} />}
    </button>
  )
}

export function Result({ flow }: { flow: Flow }) {
  const { s, write, reset, patch } = flow
  const choice = s.choice!
  const m = MODELS[choice.model]
  const generating = s.stage === 'generating'
  const live = parseGenerated(s.stream)
  const elapsed = useElapsed(s.startedAt)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const [burst, setBurst] = useState(0)
  const [copied, setCopied] = useState(false)
  const note = setupNote(choice.model, choice.effort, s.surface)

  useEffect(() => {
    if (s.result) setText(s.result.prompt)
  }, [s.result])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied, burst])

  const copy = async () => {
    await window.prompter.clipboard.write(text)
    setBurst((c) => c + 1)
    setCopied(true)
  }

  const shown = generating ? live.prompt : text

  return (
    <motion.div className="view" {...viewMotion} style={{ '--hue': m.hue } as CSSProperties}>
      <div className="row between">
        <div className="target">
          <span className="dot" />
          <b>{m.short}</b>
          <span>· {choice.effort} ·</span>
          <span>{SURFACE_INFO[s.surface].label}</span>
        </div>
        <span className="stats">
          {generating
            ? `${elapsed} sn`
            : s.result
              ? `${(s.result.elapsedMs / 1000).toFixed(1)} sn · ${s.result.usage?.outputTokens ?? 0} tok`
              : ''}
        </span>
      </div>

      {generating && (
        <div className="progress">
          <i />
        </div>
      )}

      <div className={`prompt-box ${generating ? '' : 'done'}`}>
        {editing && !generating ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        ) : (
          <pre>
            {shown ? <Highlighted text={shown} /> : <span style={{ color: 'var(--muted)' }}>Prompt yazılıyor…</span>}
            {generating && <span className="caret" />}
          </pre>
        )}
        {!generating && (
          <div className="box-tools">
            <button className={`icon-btn ${editing ? 'on' : ''}`} title="Düzenle" onClick={() => setEditing((v) => !v)}>
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>

      {generating ? (
        <button className="ghost" onClick={flow.cancel}>
          <X size={15} /> Durdur
        </button>
      ) : (
        <>
          <motion.button
            className={`cta copy ${copied ? 'copied' : ''}`}
            onClick={copy}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          >
            <Sparks burst={burst} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? 'ok' : 'copy'}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? 'Kopyalandı' : 'Promptu kopyala'}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <motion.div className="card" {...stagger(1)}>
            <div className="title">{note.title}</div>
            {note.code && (
              <div className="code">
                {note.code}
                <CopyMini text={note.code} />
              </div>
            )}
            {note.lines.map((l) => (
              <div key={l} className="line">
                {l}
              </div>
            ))}
          </motion.div>

          {s.result && s.result.notes.length > 0 && (
            <motion.div className="card" {...stagger(2)}>
              <div className="title">Neler değişti</div>
              <ul className="notes">
                {s.result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </motion.div>
          )}

          <motion.div className="row" {...stagger(3)} style={{ flexWrap: 'wrap' }}>
            <button className="ghost" onClick={() => write()}>
              <RefreshCw size={14} /> Yeniden yaz
            </button>
            {s.analysis && (
              <button className="ghost" onClick={() => patch({ stage: 'review' })}>
                <SlidersHorizontal size={14} /> Ayarı değiştir
              </button>
            )}
            <button className="ghost" onClick={reset} style={{ marginLeft: 'auto' }}>
              Yeni prompt
            </button>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}

export function stageKey(s: FlowState) {
  return s.stage === 'generating' ? 'result' : s.stage
}
