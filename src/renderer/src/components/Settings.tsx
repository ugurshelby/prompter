import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { FolderOpen, KeyRound, Plug, Power, X } from 'lucide-react'
import { SURFACE_INFO, SURFACES, type Surface } from '@shared/catalog'
import type { ReplyLanguage, Settings as SettingsT, SettingsView } from '@shared/types'
import { Segment } from './Pickers'

// Lyrica'da 23 Ekim 2026'da doğrulanan modeller (docs/vertex-ai-gemini-kurulumu.md).
const GEMINI_MODELS = [
  'gemini-4-argon',
  'gemini-3.1-pro-preview',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <i />
    </button>
  )
}

export function Settings({ onClose, onChanged }: { onClose: () => void; onChanged: (v: SettingsView) => void }) {
  const [v, setV] = useState<SettingsView | null>(null)
  const [key, setKey] = useState('')
  const [hotkey, setHotkey] = useState('')
  const [test, setTest] = useState<{ ok: boolean; ms: number; message?: string } | 'running' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.prompter.settings.get().then((view) => {
      setV(view)
      setHotkey(view.hotkey)
    })
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const apply = async (patch: Partial<SettingsT>) => {
    setError(null)
    try {
      const next = await window.prompter.settings.set(patch)
      setV(next)
      onChanged(next)
    } catch (e: any) {
      setError(String(e?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    }
  }

  const keyLabel = !v ? '' : v.key.source === 'saved' ? 'Kayıtlı (şifreli)' : v.key.source === 'env' ? '.env dosyasından' : 'Key yok'
  const keyColor = !v ? '' : v.key.present ? 'var(--ok)' : 'var(--danger)'

  return (
    <>
      <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="sheet"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        <div className="head">
          Ayarlar
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {v && (
          <div className="content">
            <div className="group">
              <span className="label">Vertex AI</span>
              <span className="pill-status">
                <i style={{ background: keyColor, boxShadow: `0 0 8px ${keyColor}` }} />
                {keyLabel} · {v.project} · {v.location}
              </span>
              <div className="row">
                <input
                  className="input mono"
                  style={{ flex: 1 }}
                  type="password"
                  placeholder="Yeni API key (şifreli saklanır)"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
                <button
                  className="ghost"
                  disabled={!key.trim()}
                  onClick={async () => {
                    const next = await window.prompter.settings.saveKey(key)
                    setKey('')
                    setV(next)
                  }}
                >
                  <KeyRound size={14} /> Kaydet
                </button>
              </div>
              <div className="row">
                <button
                  className="ghost"
                  onClick={async () => {
                    setTest('running')
                    setTest(await window.prompter.settings.test())
                  }}
                >
                  <Plug size={14} /> {test === 'running' ? 'Deneniyor…' : 'Bağlantıyı test et'}
                </button>
                {v.key.source === 'saved' && (
                  <button className="link" onClick={async () => setV(await window.prompter.settings.clearKey())}>
                    Kayıtlı key’i sil
                  </button>
                )}
              </div>
              {test && test !== 'running' && (
                <span className={`hint ${test.ok ? 'ok-text' : 'bad-text'}`}>
                  {test.ok ? `Çalışıyor · ${(test.ms / 1000).toFixed(1)} sn` : test.message}
                </span>
              )}
            </div>

            <div className="group">
              <span className="label">Optimizer modelleri</span>
              <label className="field">
                <span>Analiz (öneri + sorular)</span>
                <input
                  className="input mono"
                  list="gemini-models"
                  defaultValue={v.analysisModel}
                  onBlur={(e) => e.target.value.trim() && apply({ analysisModel: e.target.value.trim() })}
                />
              </label>
              <label className="field">
                <span>Yazım (prompt üretimi)</span>
                <input
                  className="input mono"
                  list="gemini-models"
                  defaultValue={v.generationModel}
                  onBlur={(e) => e.target.value.trim() && apply({ generationModel: e.target.value.trim() })}
                />
              </label>
              <datalist id="gemini-models">
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <span className="hint">Daha hızlı analiz için gemini-3.5-flash-lite denenebilir.</span>
            </div>

            <div className="group">
              <span className="label">Modelin sana yanıt dili</span>
              <Segment<ReplyLanguage>
                id="lang"
                value={v.replyLanguage}
                options={[
                  { value: 'tr', label: 'Türkçe' },
                  { value: 'en', label: 'English' },
                  { value: 'none', label: 'Belirtme' }
                ]}
                onChange={(replyLanguage) => apply({ replyLanguage })}
              />
              <span className="hint">Prompt her zaman İngilizce yazılır; bu ayar içine bir dil satırı ekler.</span>
            </div>

            <div className="group">
              <span className="label">Varsayılan hedef</span>
              <Segment<Surface>
                id="def-surface"
                value={v.defaultSurface}
                options={SURFACES.map((s) => ({ value: s, label: SURFACE_INFO[s].label }))}
                onChange={(defaultSurface) => apply({ defaultSurface })}
              />
            </div>

            <div className="group">
              <span className="label">Pencere</span>
              <div className="toggle-row">
                Her zaman üstte
                <Toggle on={v.alwaysOnTop} onChange={(alwaysOnTop) => apply({ alwaysOnTop })} />
              </div>
              <div className="toggle-row">
                Oturum açılışında başlat
                <Toggle on={v.launchAtLogin} onChange={(launchAtLogin) => apply({ launchAtLogin })} />
              </div>
              <label className="field">
                <span>Göster / gizle kısayolu</span>
                <input
                  className="input mono"
                  value={hotkey}
                  onChange={(e) => setHotkey(e.target.value)}
                  onBlur={() => hotkey.trim() && hotkey !== v.hotkey && apply({ hotkey: hotkey.trim() })}
                />
              </label>
              {error && <span className="hint bad-text">{error}</span>}
            </div>

            <div className="group">
              <span className="label">Bilgi tabanı</span>
              <span className="hint">
                Öneri ve yazım, knowledge/ klasöründeki kartlara dayanır. Düzenlediğin kart bir sonraki istekte kullanılır.
              </span>
              <div className="row">
                <button className="ghost" onClick={() => window.prompter.settings.openKnowledge()}>
                  <FolderOpen size={14} /> Klasörü aç
                </button>
                <button className="ghost" style={{ marginLeft: 'auto' }} onClick={() => window.prompter.window.quit()}>
                  <Power size={14} /> Çıkış
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}
