/**
 * Pins owned by the map plugin.
 *
 * The workspace pin (the sidebar's own 置顶) is only reachable when the running build exposes
 * `uiWorkspace.pinSession`; in builds where it does not, clicking 置顶 in a rail did nothing at
 * all. This store keeps a local set so the action always has a visible effect, and the rails sort
 * by the union of both.
 */
const STORAGE_KEY = 'dsh.talk-map.pins.v1'

type Listener = () => void

const listeners = new Set<Listener>()
let pinned: ReadonlySet<string> = new Set<string>()
let loaded = false

function emit(): void {
  for (const listener of listeners) listener()
}

function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

function ensureLoaded(): void {
  if (loaded) return
  loaded = true
  const stored = readStored()
  if (stored.length > 0) pinned = new Set(stored)
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...pinned]))
  } catch {
    /* storage full or blocked: the in-memory set still works for this session */
  }
}

export const localPins = {
  get(): ReadonlySet<string> {
    ensureLoaded()
    return pinned
  },
  subscribe(listener: Listener): () => void {
    ensureLoaded()
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  set(sessionId: string, next: boolean): void {
    ensureLoaded()
    if (pinned.has(sessionId) === next) return
    const copy = new Set(pinned)
    if (next) copy.add(sessionId)
    else copy.delete(sessionId)
    pinned = copy
    persist()
    emit()
  },
  toggle(sessionId: string): boolean {
    ensureLoaded()
    const next = !pinned.has(sessionId)
    localPins.set(sessionId, next)
    return next
  },
}

/** Union of the workspace pins and ours, for sorting and for the menu label. */
export function isPinnedSession(hostPins: ReadonlySet<string>, sessionId: string): boolean {
  return hostPins.has(sessionId) || localPins.get().has(sessionId)
}
