/**
 * Sessions whose 待查看 lamp the user has actually looked at.
 *
 * 「最近的任务」 means "finished, then read": a conversation only descends into the strip once it has
 * been through 任务中 → 任务完成待查看 → 看过. Sessions that never finished must not appear there, so
 * this set is the gate instead of "has no lamp right now".
 */
const STORAGE_KEY = 'dsh.talk-map.read-finished.v1'
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

type Listener = () => void

const listeners = new Set<Listener>()
let read: ReadonlyMap<string, number> = new Map()
let loaded = false

function emit(): void {
  for (const listener of listeners) listener()
}

function load(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return
    const cutoff = Date.now() - MAX_AGE_MS
    const next = new Map<string, number>()
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at !== 'number' || at < cutoff) continue
      next.set(id, at)
    }
    read = next
  } catch {
    read = new Map()
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(read)))
  } catch {
    /* quota or blocked storage: the in-memory map still works for this session */
  }
}

export const readArchive = {
  get(): ReadonlyMap<string, number> {
    load()
    return read
  },
  has(sessionId: string): boolean {
    load()
    return read.has(sessionId)
  },
  subscribe(listener: Listener): () => void {
    load()
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  /** Called when a 待查看 card is opened (or its lamp is dropped because it was read). */
  mark(sessionId: string): void {
    load()
    const next = new Map(read)
    next.set(sessionId, Date.now())
    read = next
    persist()
    emit()
  },
  /**
   * A session that starts working again leaves the strip: it is back to 任务中, and the next
   * completion has to be read before it descends again.
   */
  forget(sessionId: string): void {
    load()
    if (!read.has(sessionId)) return
    const next = new Map(read)
    next.delete(sessionId)
    read = next
    persist()
    emit()
  },
}
