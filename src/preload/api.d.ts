import type {
  Analysis,
  AnalyzeRequest,
  GenerateRequest,
  HistoryEntry,
  Settings,
  SettingsView,
  StreamEvent,
  WindowMode
} from '../shared/types'

export interface PrompterApi {
  settings: {
    get(): Promise<SettingsView>
    set(patch: Partial<Settings>): Promise<SettingsView>
    saveKey(key: string): Promise<SettingsView>
    clearKey(): Promise<SettingsView>
    test(): Promise<{ ok: boolean; ms: number; message?: string }>
    openKnowledge(): Promise<string>
  }
  engine: {
    analyze(req: AnalyzeRequest): Promise<Analysis>
    generate(req: GenerateRequest): Promise<void>
    cancel(id: string): Promise<void>
    onStream(cb: (ev: StreamEvent) => void): () => void
  }
  history: {
    list(): Promise<HistoryEntry[]>
    remove(id: string): Promise<void>
    clear(): Promise<void>
  }
  window: {
    getState(): Promise<{ mode: WindowMode; pinned: boolean }>
    setMode(mode: WindowMode): Promise<void>
    togglePin(): Promise<boolean>
    hide(): Promise<void>
    quit(): Promise<void>
    dragStart(kind: 'move' | 'resize'): void
    dragMove(): void
    dragEnd(): void
    onMode(cb: (mode: WindowMode) => void): () => void
    onPinned(cb: (on: boolean) => void): () => void
  }
  clipboard: {
    write(text: string): Promise<void>
  }
  platform: string
}

declare global {
  interface Window {
    prompter: PrompterApi
  }
}
