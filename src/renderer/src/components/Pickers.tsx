import { motion } from 'motion/react'
import { EFFORTS, EFFORT_INFO, MODELS, type Effort, type ModelId } from '@shared/catalog'
import type { CSSProperties } from 'react'

export function Segment<T extends string>({
  id,
  value,
  options,
  onChange
}: {
  id: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segment">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.value === value && (
            <motion.span layoutId={`seg-${id}`} className="thumb" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}

const ORDER: ModelId[] = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1']

export function ModelPicker({ value, onChange }: { value: ModelId; onChange: (m: ModelId) => void }) {
  return (
    <div className="models">
      {ORDER.map((id, i) => {
        const m = MODELS[id]
        const selected = id === value
        return (
          <motion.button
            key={id}
            className={`model-card ${selected ? 'selected' : ''}`}
            style={{ '--hue': m.hue } as CSSProperties}
            onClick={() => onChange(id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {selected && <motion.span layoutId="model-glow" className="glow" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <div className="name">
              <span className="dot" />
              {m.short}
            </div>
            <div className="tag">{m.tagline}</div>
            <div className="price">
              ${m.price.input} / ${m.price.output} · {m.latency}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

export function EffortPicker({
  value,
  onChange,
  defaultEffort
}: {
  value: Effort
  onChange: (e: Effort) => void
  defaultEffort?: Effort
}) {
  const index = EFFORTS.indexOf(value)
  return (
    <div className="effort">
      <div className="effort-track">
        {EFFORTS.map((e, i) => (
          <button
            key={e}
            className={`effort-step ${e === value ? 'active' : ''} ${e === defaultEffort ? 'def' : ''}`}
            onClick={() => onChange(e)}
          >
            <span className="bar">
              <motion.i
                initial={false}
                animate={{ scaleX: i <= index ? 1 : 0, opacity: i <= index ? 0.55 + (i / 4) * 0.45 : 0 }}
                transition={{ duration: 0.35, delay: i <= index ? i * 0.04 : 0, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            {EFFORT_INFO[e].label}
          </button>
        ))}
      </div>
      <motion.div key={value} className="effort-hint" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        {EFFORT_INFO[value].hint}
      </motion.div>
    </div>
  )
}

export function Meter({ effort }: { effort: Effort }) {
  const index = EFFORTS.indexOf(effort)
  return (
    <span className="meter">
      {EFFORTS.map((e, i) => (
        <motion.i
          key={e}
          className={i <= index ? 'on' : ''}
          initial={{ scaleX: 0.3, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.25 + i * 0.07, duration: 0.3 }}
        />
      ))}
    </span>
  )
}
