import { motion } from 'motion/react'
import { MODELS, MODEL_IDS } from '@shared/catalog'

/** Küçük marka işareti: ışını kıran prizma. */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="lg-prism" x1="4" y1="3" x2="20" y2="21">
          <stop stopColor="#ffd36e" />
          <stop offset="1" stopColor="#ff8a4c" />
        </linearGradient>
      </defs>
      <path d="M12 3.5 20 19H4L12 3.5Z" stroke="url(#lg-prism)" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(255,138,76,0.12)" />
      <path d="M1 13.2 9.4 12" stroke="#fff" strokeOpacity=".8" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14.8 12.4 23 9.5" stroke="#6cc9ff" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14.8 12.6 23 13.4" stroke="#ff9a5a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

const RAY_Y = [30, 60, 90, 120]

/** Analiz sırasında: ham ışın prizmaya girer, model renklerinde dört ışına ayrılır. */
export function PrismLoader() {
  return (
    <svg width="270" height="150" viewBox="0 0 270 150" fill="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="beam-in" x1="0" x2="1">
          <stop stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffffff" stopOpacity=".16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".02" />
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffd36e" />
          <stop offset=".5" stopColor="#ff8a4c" />
          <stop offset="1" stopColor="#f78fb3" />
        </linearGradient>
        {MODEL_IDS.map((id) => (
          <linearGradient key={id} id={`ray-${id}`} x1="0" x2="1">
            <stop stopColor={MODELS[id].hue} stopOpacity=".95" />
            <stop offset="1" stopColor={MODELS[id].hue} stopOpacity="0" />
          </linearGradient>
        ))}
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* gelen ışın */}
      <line x1="0" y1="82" x2="113" y2="74" stroke="url(#beam-in)" strokeWidth="2.2" strokeLinecap="round" />
      <motion.line
        x1="0"
        y1="82"
        x2="113"
        y2="74"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="10 120"
        animate={{ strokeDashoffset: [130, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      />

      {/* çıkan ışınlar */}
      {MODEL_IDS.map((id, i) => (
        <g key={id}>
          <line x1="152" y1="76" x2="270" y2={RAY_Y[i]} stroke={`url(#ray-${id})`} strokeWidth="2" strokeLinecap="round" />
          <motion.line
            x1="152"
            y1="76"
            x2="270"
            y2={RAY_Y[i]}
            stroke={MODELS[id].hue}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="14 140"
            animate={{ strokeDashoffset: [0, -154], opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 + i * 0.18 }}
          />
        </g>
      ))}

      {/* prizma */}
      <motion.g
        style={{ transformOrigin: '132px 82px' }}
        animate={{ rotate: [-2.5, 2.5, -2.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.path
          d="M132 26 176 124H88L132 26Z"
          fill="#ff8a4c"
          filter="url(#soft)"
          animate={{ opacity: [0.1, 0.32, 0.1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <path d="M132 26 176 124H88L132 26Z" fill="url(#glass)" stroke="url(#edge)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M113 74 152 76" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        <path d="M132 34 140 52" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}
