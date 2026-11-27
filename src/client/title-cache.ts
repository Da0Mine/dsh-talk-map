/**
 * Title cache — the same trick the card bodies already use.
 *
 * Bodies come from `preview-cache` in localStorage, so they paint on the very first render, before
 * the Host has said anything. Titles used to wait for the session list to hydrate, which is why a
 * restart showed raw ids (or 会话加载中) for ten-odd seconds. This keeps the last known title per
 * session on disk so the rail can paint immediately and reconcile when the list arrives.
 */
const STORAGE_KEY = 'dsh.talk-map.titles.v1'
const MAX_ENTRIES = 300
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface Entry {
  title: string
  at: number
}

type Store = Record<string, Entry>

let cache: Store | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function load(): Store {
  if (cache !== null) return cache
  if (typeof localStorage === 'undefined') {
    cache = {}
    return cache
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    const cutoff = Date.now() - MAX_AGE_MS
    const out: Store = {}
    if (parsed !== null && typeof parsed === 'object') {
      for (const [sessionId, value] of Object.entries(parsed as Record<string, unknown>)) {
        const entry = value as Partial<Entry> | null
        if (entry === null || typeof entry !== 'object') continue
        if (typeof entry.title !== 'string' || typeof entry.at !== 'number') continue
        if (entry.at < cutoff) continue
        out[sessionId] = { title: entry.title, at: entry.at }
      }
    }
    cache = out
  } catch {
    cache = {}
  }
  return cache
}

function persist(): void {
  if (cache === null || typeof localStorage === 'undefined') return
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      const entries = Object.entries(load())
        .sort((a, b) => b[1].at - a[1].at)
        .slice(0, MAX_ENTRIES)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)))
    } catch {
      /* quota or blocked storage: the in-memory copy still works for this session */
    }
  }, 250)
}

/** Everything known right now, for the initial state of a component. */
export function readTitles(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [sessionId, entry] of Object.entries(load())) out[sessionId] = entry.title
  return out
}

export function putTitle(sessionId: string, title: string): void {
  const store = load()
  const current = store[sessionId]
  if (current !== undefined && current.title === title) return
  store[sessionId] = { title, at: Date.now() }
  persist()
}
