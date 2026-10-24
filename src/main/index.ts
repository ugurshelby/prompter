import { app, clipboard, globalShortcut, ipcMain, Menu, nativeImage, shell, Tray } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AnalyzeRequest, GenerateRequest, Settings, StreamEvent, WindowMode } from '@shared/types'
import { clearSavedKey, getSettings, knowledgeDir, saveApiKey, settingsView, updateSettings } from './config'
import { analyze } from './engine/analyze'
import { generatePrompt } from './engine/generate'
import { generate } from './gemini'
import { clearHistory, deleteHistory, listHistory, recordAnalysis, recordOutput } from './history'
import { selftest } from './selftest'
import {
  applyPin,
  createWindow,
  dragEnd,
  dragMove,
  dragStart,
  getMode,
  getWindow,
  setMode,
  toggleVisible
} from './window'

const SELFTEST = process.argv.includes('--selftest')
if (!SELFTEST && !app.requestSingleInstanceLock()) app.quit()

let tray: Tray | null = null
const running = new Map<string, AbortController>()

function resource(name: string) {
  return app.isPackaged ? join(process.resourcesPath, name) : join(app.getAppPath(), 'resources', name)
}

function registerHotkey(accelerator: string) {
  globalShortcut.unregisterAll()
  try {
    return globalShortcut.register(accelerator, toggleVisible)
  } catch {
    return false
  }
}

function buildTrayMenu() {
  const s = getSettings()
  return Menu.buildFromTemplate([
    { label: 'Göster / Gizle', click: toggleVisible },
    { label: getMode() === 'pill' ? 'Paneli aç' : 'Küçült', click: () => setMode(getMode() === 'pill' ? 'panel' : 'pill') },
    {
      label: 'Her zaman üstte',
      type: 'checkbox',
      checked: s.alwaysOnTop,
      click: (item) => applySettings({ alwaysOnTop: item.checked })
    },
    { type: 'separator' },
    { label: 'Çıkış', click: () => app.quit() }
  ])
}

function createTray() {
  const icon = nativeImage.createFromPath(resource(process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Prompter')
  tray.setContextMenu(buildTrayMenu())
  tray.on('click', toggleVisible)
}

// Kurulu sürümde uygulamanın kendisi, geliştirmede electron.exe + proje klasörü açılışta başlatılır.
// Windows'ta kayıt adı AppUserModelId olduğu için ikisi aynı kaydı günceller.
function setLaunchAtLogin(on: boolean) {
  app.setLoginItemSettings(
    app.isPackaged ? { openAtLogin: on } : { openAtLogin: on, path: process.execPath, args: [app.getAppPath()] }
  )
}

function applySettings(patch: Partial<Settings>) {
  const before = getSettings()
  const next = updateSettings(patch)
  if (patch.alwaysOnTop !== undefined) applyPin(next.alwaysOnTop)
  if (patch.hotkey && patch.hotkey !== before.hotkey && !registerHotkey(next.hotkey)) {
    updateSettings({ hotkey: before.hotkey })
    registerHotkey(before.hotkey)
    throw new Error(`Kısayol kaydedilemedi: ${patch.hotkey}`)
  }
  if (patch.launchAtLogin !== undefined) setLaunchAtLogin(next.launchAtLogin)
  tray?.setContextMenu(buildTrayMenu())
  return settingsView()
}

function registerIpc() {
  ipcMain.handle('settings:get', () => settingsView())
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => applySettings(patch))
  ipcMain.handle('settings:saveKey', (_e, key: string) => {
    saveApiKey(key)
    return settingsView()
  })
  ipcMain.handle('settings:clearKey', () => {
    clearSavedKey()
    return settingsView()
  })
  ipcMain.handle('settings:test', async () => {
    const started = Date.now()
    try {
      await generate({
        model: getSettings().analysisModel,
        system: 'Reply with the single word: ok',
        user: 'ping',
        temperature: 0,
        timeoutMs: 60_000
      })
      return { ok: true, ms: Date.now() - started }
    } catch (e: any) {
      return { ok: false, ms: Date.now() - started, message: e?.message ?? String(e) }
    }
  })
  ipcMain.handle('settings:openKnowledge', () => shell.openPath(knowledgeDir()))

  ipcMain.handle('engine:analyze', async (_e, req: AnalyzeRequest) => {
    const analysis = await analyze(req)
    return { ...analysis, historyId: recordAnalysis(req, analysis) }
  })
  ipcMain.handle('engine:generate', async (e, req: GenerateRequest) => {
    const controller = new AbortController()
    running.set(req.id, controller)
    const send = (ev: StreamEvent) => {
      if (!e.sender.isDestroyed()) e.sender.send('engine:stream', ev)
    }
    try {
      const result = await generatePrompt(req, (text) => send({ id: req.id, type: 'chunk', text }), controller.signal)
      recordOutput(req, result)
      send({ id: req.id, type: 'done', result })
    } catch (err: any) {
      send({ id: req.id, type: 'error', message: err?.message ?? String(err) })
    } finally {
      running.delete(req.id)
    }
  })
  ipcMain.handle('engine:cancel', (_e, id: string) => running.get(id)?.abort())

  ipcMain.handle('history:list', () => listHistory())
  ipcMain.handle('history:delete', (_e, id: string) => deleteHistory(id))
  ipcMain.handle('history:clear', () => clearHistory())

  ipcMain.handle('window:setMode', (_e, mode: WindowMode) => {
    setMode(mode)
    tray?.setContextMenu(buildTrayMenu())
  })
  ipcMain.handle('window:getState', () => ({ mode: getMode(), pinned: getSettings().alwaysOnTop }))
  ipcMain.handle('window:togglePin', () => applySettings({ alwaysOnTop: !getSettings().alwaysOnTop }).alwaysOnTop)
  ipcMain.handle('window:hide', () => getWindow()?.hide())
  ipcMain.handle('window:quit', () => app.quit())
  ipcMain.on('window:dragStart', (_e, kind: 'move' | 'resize') => dragStart(kind))
  ipcMain.on('window:dragMove', () => dragMove())
  ipcMain.on('window:dragEnd', () => dragEnd())

  ipcMain.handle('clipboard:write', (_e, text: string) => clipboard.writeText(text))
}

app.on('second-instance', () => {
  const win = getWindow()
  if (!win) return
  win.show()
  win.focus()
})

app.whenReady().then(() => {
  if (SELFTEST) return selftest(process.argv)
  if (process.platform === 'win32') app.setAppUserModelId('com.prompter.app')
  if (process.platform === 'darwin') app.dock?.hide()
  registerIpc()
  // Ayar açıksa kaydı bu kopyanın yoluna göre tazele (ör. geliştirmeden kurulu sürüme geçince).
  if (getSettings().launchAtLogin) setLaunchAtLogin(true)
  const win = createWindow()
  createTray()
  registerHotkey(getSettings().hotkey)
  if (process.env.PROMPTER_CAPTURE) captureStates(win, process.env.PROMPTER_CAPTURE)
})

/**
 * Geliştirme: panel ve pill hâllerinin ekran görüntüsünü alıp çıkar.
 * PROMPTER_CAPTURE_PROMPT verilirse arayüz üzerinden gerçek bir analiz → yazım akışı da çalıştırılır.
 */
function captureStates(win: Electron.BrowserWindow, dir: string) {
  const js = (code: string) => win.webContents.executeJavaScript(code)
  const shot = async (name: string) => {
    const img = await win.webContents.capturePage()
    writeFileSync(join(dir, `${name}.png`), img.toPNG())
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const until = async (selector: string, timeoutMs = 240_000) => {
    const end = Date.now() + timeoutMs
    while (Date.now() < end) {
      if (await js(`!!document.querySelector(${JSON.stringify(selector)})`)) return true
      if (await js(`!!document.querySelector('.error')`)) return false
      await wait(500)
    }
    return false
  }
  win.webContents.once('did-finish-load', async () => {
    await wait(1500)
    await shot('panel')
    setMode('pill')
    await wait(900)
    await shot('pill')
    setMode('panel')
    await wait(900)

    const prompt = process.env.PROMPTER_CAPTURE_PROMPT
    if (prompt) {
      await js(`(() => {
        const ta = document.querySelector('textarea')
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, ${JSON.stringify(prompt)})
        ta.dispatchEvent(new Event('input', { bubbles: true }))
      })()`)
      await wait(300)
      await js(`document.querySelector('.cta').click()`)
      await wait(2500)
      await shot('analyzing')
      const reviewed = await until('.rec')
      await wait(1500)
      await shot(reviewed ? 'review' : 'error')
      if (reviewed) {
        await js(`document.querySelector('.row.sticky .cta').click()`)
        await wait(3000)
        await shot('generating')
        const done = await until('.cta.copy')
        await wait(1500)
        await shot(done ? 'result' : 'error')
        await js(`document.querySelector('.icon-btn[title="Geçmiş"]').click()`)
        await wait(1200)
        await shot('history')
      }
    }
    app.exit(0)
  })
}

// Pencere kapatılınca tray'de yaşamaya devam eder; çıkış tray menüsünden.
app.on('window-all-closed', () => {})
app.on('will-quit', () => globalShortcut.unregisterAll())
