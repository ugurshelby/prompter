import { motion } from 'motion/react'
import { useRef } from 'react'
import { Logo } from './Prism'

/** Küçültülmüş hâl: sürüklenebilir küre. Tıklayınca panel açılır. */
export function Pill({ busy, badge, onOpen }: { busy: boolean; badge: boolean; onOpen: () => void }) {
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const frame = useRef(0)
  const api = window.prompter.window

  return (
    <div className="pill-wrap">
      <motion.div
        className={`orb ${busy ? 'busy' : ''}`}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        whileHover={{ scale: 1.06 }}
        title={busy ? 'Çalışıyor…' : 'Prompter'}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          start.current = { x: e.screenX, y: e.screenY, moved: false }
          api.dragStart('move')
        }}
        onPointerMove={(e) => {
          const st = start.current
          if (!st) return
          if (!st.moved && Math.hypot(e.screenX - st.x, e.screenY - st.y) > 4) st.moved = true
          if (st.moved && !frame.current) {
            frame.current = requestAnimationFrame(() => {
              frame.current = 0
              api.dragMove()
            })
          }
        }}
        onPointerUp={() => {
          const st = start.current
          start.current = null
          api.dragEnd()
          if (st && !st.moved) onOpen()
        }}
      >
        <span className="halo" />
        <span className="ring" />
        <span className="core" />
        <span style={{ position: 'relative', display: 'grid' }}>
          <Logo size={26} />
        </span>
        {badge && (
          <motion.span className="badge" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.5 }} />
        )}
      </motion.div>
    </div>
  )
}
