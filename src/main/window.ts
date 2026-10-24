import { BrowserWindow, screen, type Rectangle } from 'electron'
import { join } from 'node:path'
import type { WindowMode } from '@shared/types'
import { getSettings, readUserJson, writeJson } from './config'

const PANEL = { width: 440, height: 640, minWidth: 380, minHeight: 480 }
const PILL = 84
const SNAP = 24

interface WindowState {
  panel?: Rectangle
  pill?: { x: number; y: number }
  mode?: WindowMode
}

let win: BrowserWindow | null = null
let state: WindowState = {}
let mode: WindowMode = 'panel'

const save = () => writeJson('window-state.json', state)

/** Pencere en az bir ekranın çalışma alanı içinde kalsın. */
function onScreen(b: Rectangle): Rectangle {
  const area = screen.getDisplayMatching(b).workArea
  const width = Math.min(b.width, area.width)
  const height = Math.min(b.height, area.height)
  return {
    width,
    height,
    x: Math.min(Math.max(b.x, area.x), area.x + area.width - width),
    y: Math.min(Math.max(b.y, area.y), area.y + area.height - height)
  }
}

function defaultPanel(): Rectangle {
  const area = screen.getPrimaryDisplay().workArea
  return {
    width: PANEL.width,
    height: PANEL.height,
    x: area.x + area.width - PANEL.width - 32,
    y: area.y + Math.round((area.height - PANEL.height) / 2)
  }
}

export function getWindow() {
  return win
}

export function createWindow(): BrowserWindow {
  state = readUserJson<WindowState>('window-state.json', {})
  const panel = onScreen(state.panel ?? defaultPanel())

  win = new BrowserWindow({
    ...panel,
    minWidth: PANEL.minWidth,
    minHeight: PANEL.minHeight,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: 'Prompter',
    alwaysOnTop: getSettings().alwaysOnTop,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  applyPin(getSettings().alwaysOnTop)
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  win.on('ready-to-show', () => win?.show())
  win.on('moved', remember)
  win.on('resized', remember)

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))

  return win
}

function remember() {
  if (!win) return
  const b = win.getBounds()
  if (mode === 'panel') state.panel = b
  else state.pill = { x: b.x, y: b.y }
  save()
}

export function applyPin(on: boolean) {
  if (!win) return
  win.setAlwaysOnTop(on, process.platform === 'darwin' ? 'floating' : 'screen-saver')
  win.webContents.send('window:pinned', on)
}

export function setMode(next: WindowMode) {
  if (!win || next === mode) return
  const current = win.getBounds()
  if (next === 'pill') {
    state.panel = current
    const pos = state.pill ?? { x: current.x + current.width - PILL, y: current.y }
    win.setMinimumSize(PILL, PILL)
    win.setResizable(false)
    win.setBounds(onScreen({ ...pos, width: PILL, height: PILL }))
  } else {
    const panel = state.panel ?? defaultPanel()
    state.pill = { x: current.x, y: current.y }
    // Panel, pill'in bulunduğu köşeden açılsın.
    const area = screen.getDisplayMatching(current).workArea
    const openLeft = current.x + PILL / 2 > area.x + area.width / 2
    const x = openLeft ? current.x + PILL - panel.width : current.x
    win.setResizable(true)
    win.setMinimumSize(PANEL.minWidth, PANEL.minHeight)
    win.setBounds(onScreen({ x, y: current.y, width: panel.width, height: panel.height }))
  }
  mode = next
  state.mode = next
  save()
  win.webContents.send('window:mode', next)
}

export function getMode() {
  return mode
}

// --- Elle sürükleme (pill) ve boyutlandırma (panel) ---------------------------
// Pill'de tıklama ile sürüklemeyi ayırmak için sürükleme JS ile yapılır.

let drag: { cursor: Electron.Point; bounds: Rectangle; kind: 'move' | 'resize' } | null = null

export function dragStart(kind: 'move' | 'resize') {
  if (!win) return
  drag = { cursor: screen.getCursorScreenPoint(), bounds: win.getBounds(), kind }
}

export function dragMove() {
  if (!win || !drag) return
  const p = screen.getCursorScreenPoint()
  const dx = p.x - drag.cursor.x
  const dy = p.y - drag.cursor.y
  if (drag.kind === 'move') {
    win.setPosition(drag.bounds.x + dx, drag.bounds.y + dy)
  } else {
    win.setSize(
      Math.max(PANEL.minWidth, drag.bounds.width + dx),
      Math.max(PANEL.minHeight, drag.bounds.height + dy)
    )
  }
}

export function dragEnd() {
  if (!win || !drag) return
  if (drag.kind === 'move' && mode === 'pill') {
    // Ekran kenarına yakınsa yapıştır.
    const b = win.getBounds()
    const area = screen.getDisplayMatching(b).workArea
    let { x, y } = b
    if (x - area.x < SNAP) x = area.x + 8
    if (area.x + area.width - (x + b.width) < SNAP) x = area.x + area.width - b.width - 8
    if (y - area.y < SNAP) y = area.y + 8
    if (area.y + area.height - (y + b.height) < SNAP) y = area.y + area.height - b.height - 8
    win.setPosition(x, y)
  }
  drag = null
  remember()
}

export function toggleVisible() {
  if (!win) return
  if (win.isVisible() && win.isFocused()) win.hide()
  else {
    win.show()
    win.focus()
  }
}
