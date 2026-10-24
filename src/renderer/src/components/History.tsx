import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Check, Copy, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { MODELS, SURFACE_INFO } from '@shared/catalog'
import type { HistoryEntry } from '@shared/types'
import { Logo } from './Prism'

const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

function ago(ts: number) {
  const s = Math.round((ts - Date.now()) / 1000)
  if (s > -45) return 'az önce'
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month']
  ]
  let v = s
  for (const [n, unit] of steps) {
    if (Math.abs(v) < n) return rtf.format(Math.round(v), unit)
    v /= n
  }
  return rtf.format(Math.round(v), 'year')
}

function Item({
  entry,
  index,
  onOpen,
  onRewrite,
  onDelete
}: {
  entry: HistoryEntry
  index: number
  onOpen: () => void
  onRewrite: () => void
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)
  const last = entry.outputs.at(-1)
  const model = last ? MODELS[last.model] : MODELS[entry.analysis.recommendation.model]

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <motion.li
      layout
      className="h-item"
      style={{ '--hue': model.hue } as CSSProperties}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.035, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, x: -24, scale: 0.98, transition: { duration: 0.2 } }}
    >
      <button className="h-body" onClick={onOpen} title="Aç">
        <div className="h-meta">
          <span className="dot" />
          {last ? (
            <b>
              {model.short} · {last.effort}
            </b>
          ) : (
            <span className="h-only">Yalnızca analiz</span>
          )}
          <span>· {SURFACE_INFO[entry.surface].label}</span>
          {entry.outputs.length > 1 && <span className="h-count">×{entry.outputs.length}</span>}
          <span className="h-time">{ago(entry.updatedAt)}</span>
        </div>
        <div className="h-text">{entry.prompt}</div>
      </button>
      <div className="h-actions">
        {last && (
          <button
            className={`h-btn ${copied ? 'ok' : ''}`}
            onClick={async () => {
              await window.prompter.clipboard.write(last.prompt)
              setCopied(true)
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
        )}
        <button className="h-btn" onClick={onRewrite}>
          <RefreshCw size={13} />
          {last ? 'Yeniden yaz' : 'Yaz'}
        </button>
        <button className="icon-btn h-del" title="Sil" onClick={onDelete}>
          <Trash2 size={13} />
        </button>
      </div>
    </motion.li>
  )
}

export function History({
  onClose,
  onOpen,
  onRewrite
}: {
  onClose: () => void
  onOpen: (e: HistoryEntry) => void
  onRewrite: (e: HistoryEntry) => void
}) {
  const [items, setItems] = useState<HistoryEntry[] | null>(null)
  const [query, setQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    window.prompter.history.list().then(setItems)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    if (!items || !q) return items ?? []
    return items.filter((e) =>
      [e.prompt, e.analysis.intent, e.outputs.at(-1)?.prompt ?? ''].some((t) => t.toLocaleLowerCase('tr').includes(q))
    )
  }, [items, query])

  const remove = async (id: string) => {
    setItems((list) => list?.filter((e) => e.id !== id) ?? null)
    await window.prompter.history.remove(id)
  }

  return (
    <>
      <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="sheet left"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        <div className="head">
          <span>
            Geçmiş {items && items.length > 0 && <span className="h-total">{items.length}</span>}
          </span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {items && items.length > 0 && (
          <div className="h-search">
            <Search size={14} />
            <input placeholder="Promptlarda ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}

        <div className="content">
          {items && items.length === 0 && (
            <motion.div className="h-empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <Logo size={34} />
              <b>Henüz geçmiş yok</b>
              <span>Analiz ettiğin ve yazdırdığın promptlar burada birikir.</span>
            </motion.div>
          )}
          {items && items.length > 0 && shown.length === 0 && <span className="hint">“{query}” için sonuç yok.</span>}
          <ul className="h-list">
            <AnimatePresence mode="popLayout">
              {shown.map((e, i) => (
                <Item
                  key={e.id}
                  entry={e}
                  index={i}
                  onOpen={() => onOpen(e)}
                  onRewrite={() => onRewrite(e)}
                  onDelete={() => remove(e.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>

        {items && items.length > 0 && (
          <div className="h-foot">
            <span className="hint">Son 200 kayıt bu bilgisayarda saklanır.</span>
            <button
              className={`link ${confirmClear ? 'bad-text' : ''}`}
              onClick={async () => {
                if (!confirmClear) return setConfirmClear(true)
                await window.prompter.history.clear()
                setItems([])
                setConfirmClear(false)
              }}
              onBlur={() => setConfirmClear(false)}
            >
              <Trash2 size={12} /> {confirmClear ? 'Emin misin? Tümü silinecek' : 'Tümünü temizle'}
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
