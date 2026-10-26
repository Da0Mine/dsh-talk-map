/**
 * "It finished while the map was up" tracking.
 *
 * The shell marks a session *unread* only when it finishes while that session is
 * not the main view. Opening the map from a conversation keeps that conversation
 * as the selected session, so a turn that completes behind the map never gets
 * that mark — the card stays plain and the user misses it.
 *
 * So the map keeps its own projection: while the panel is mounted we watch each
 * session's running flag, and a running → idle transition marks it finished.
 * The mark clears when the session runs again, when it starts waiting for the
 * user, or when the user opens it from the map.
 */
import type { SessionStatusFact } from './dsh.ts'

interface SummaryLike {
  readonly running?: boolean
  readonly pendingInteraction?: unknown
}

const lastRunning = new Map<string, boolean>()
const finished = new Set<string>()
let snapshot: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function publish(): void {
  snapshot = new Set(finished)
  for (const listener of listeners) listener()
}

export const sessionActivity = {
  getSnapshot(): ReadonlySet<string> {
    return snapshot
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  isFinished(sessionId: string): boolean {
    return finished.has(sessionId)
  },
  /**
   * Feed one observation of the live status map. Only a transition observed
   * while the map is mounted counts, so a session that finished while the map
   * was closed keeps whatever the shell decided for it.
   */
  observe(
    status: ReadonlyMap<string, SessionStatusFact>,
    summaries: Readonly<Record<string, SummaryLike>>,
  ): void {
    let changed = false
    const ids = new Set<string>([...status.keys(), ...Object.keys(summaries)])
    for (const sessionId of ids) {
      const fact = status.get(sessionId)
      const row = summaries[sessionId]
      const running = fact?.running === true || row?.running === true
      const blocked = (fact !== undefined && fact.pendingInteraction !== undefined)
        || row?.pendingInteraction !== undefined
      const wasRunning = lastRunning.get(sessionId)
      lastRunning.set(sessionId, running)
      if (running || blocked) {
        // A new run (or a question) supersedes "finished, unread".
        if (finished.delete(sessionId)) changed = true
        continue
      }
      if (wasRunning === true && !finished.has(sessionId)) {
        finished.add(sessionId)
        changed = true
      }
    }
    if (changed) publish()
  },
  /** The user is looking at it now: stop advertising it as unread. */
  acknowledge(sessionId: string): void {
    if (finished.delete(sessionId)) publish()
  },
  /** The session is gone (deleted / archived): drop both records. */
  forget(sessionId: string): void {
    lastRunning.delete(sessionId)
    if (finished.delete(sessionId)) publish()
  },
}
