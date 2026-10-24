import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Settings, SettingsView } from '@shared/types'

const DEFAULTS: Settings = {
  analysisModel: 'gemini-4-argon',
  generationModel: 'gemini-4-argon',
  replyLanguage: 'tr',
  defaultSurface: 'claude-code',
  alwaysOnTop: true,
  hotkey: 'CommandOrControl+Shift+Space',
  launchAtLogin: false
}

const userFile = (name: string) => join(app.getPath('userData'), name)

function readJson<T>(path: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return fallback
  }
}

export function writeJson(name: string, data: unknown) {
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(userFile(name), JSON.stringify(data, null, 2))
}

export function readUserJson<T>(name: string, fallback: T): T {
  return readJson(userFile(name), fallback)
}

let settings: Settings | null = null

export function getSettings(): Settings {
  settings ??= readUserJson('settings.json', DEFAULTS)
  return settings
}

export function updateSettings(patch: Partial<Settings>): Settings {
  settings = { ...getSettings(), ...patch }
  writeJson('settings.json', settings)
  return settings
}

// --- Vertex kimlik bilgisi ---------------------------------------------------
// Sıra: arayüzden kaydedilmiş (safeStorage ile şifreli) key → ortam değişkeni → .env dosyası.
// Key hiçbir zaman arayüze gönderilmez.

function parseEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

function envValues(): Record<string, string> {
  const files = [join(app.getAppPath(), '.env'), userFile('.env')]
  const fromFiles = Object.assign({}, ...files.map(parseEnv))
  const fromProcess = Object.fromEntries(
    ['VERTEX_API_KEY', 'VERTEX_PROJECT_ID', 'VERTEX_LOCATION']
      .filter((k) => process.env[k])
      .map((k) => [k, process.env[k] as string])
  )
  return { ...fromFiles, ...fromProcess }
}

const KEY_FILE = 'vertex.key'

function savedKey(): string | null {
  const path = userFile(KEY_FILE)
  if (!existsSync(path) || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(readFileSync(path))
  } catch {
    return null
  }
}

export interface VertexConfig {
  key: string | null
  source: 'saved' | 'env' | 'none'
  project: string
  location: string
}

export function getVertexConfig(): VertexConfig {
  const env = envValues()
  const saved = savedKey()
  const key = saved ?? env.VERTEX_API_KEY ?? null
  return {
    key,
    source: saved ? 'saved' : key ? 'env' : 'none',
    project: env.VERTEX_PROJECT_ID || 'the-curate',
    location: env.VERTEX_LOCATION || 'global'
  }
}

export function saveApiKey(key: string) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Bu sistemde güvenli depolama kullanılamıyor.')
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(userFile(KEY_FILE), safeStorage.encryptString(key.trim()))
}

export function clearSavedKey() {
  rmSync(userFile(KEY_FILE), { force: true })
}

export function settingsView(): SettingsView {
  const v = getVertexConfig()
  return {
    ...getSettings(),
    key: { present: !!v.key, source: v.source },
    project: v.project,
    location: v.location
  }
}

export function knowledgeDir() {
  return app.isPackaged ? join(process.resourcesPath, 'knowledge') : join(app.getAppPath(), 'knowledge')
}
