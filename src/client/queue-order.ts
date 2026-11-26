/**
 * One ordering for every queue surface (the map's rail and the native sidebar queue).
 *
 * The rule, as the user stated it:
 *   异常终止(error) > 等待用户回答(waiting) > 待查看(done) > 正在运行(running) > 待发送(draft)
 * and *inside one bucket* cards are ordered by time (newest first).
 *
 * A manual drag can only reorder cards INSIDE their own bucket — it can never move a card
 * across priorities, so the two surfaces keep showing the same sequence.
 */
import type { CardGlow } from './SessionCard.tsx'

/** Lower number = shown first. */
export function queueRank(lamp: CardGlow | undefined, draft: boolean, pinned = false): number {
  // Pinned first: otherwise flipping 置顶 changed nothing visible in a rail.
  if (pinned) return -1
  if (lamp === 'error') return 0
  if (lamp === 'waiting') return 1
  if (lamp === 'done') return 2
  if (lamp === 'running') return 3
  return draft ? 4 : 5
}

export interface QueueSortable {
  lamp?: CardGlow
  draft?: boolean
  pinned?: boolean
  updatedAt?: number
  /** Rail only: the user's drag position, applied inside the card's own bucket. */
  manualIndex?: number
}

/** Priority first, then the user's drag position inside that priority, then newest first. */
export function compareQueueRows(a: QueueSortable, b: QueueSortable): number {
  const byRank = queueRank(a.lamp, a.draft === true, a.pinned === true) - queueRank(b.lamp, b.draft === true, b.pinned === true)
  if (byRank !== 0) return byRank
  const aIndex = a.manualIndex ?? Number.MAX_SAFE_INTEGER
  const bIndex = b.manualIndex ?? Number.MAX_SAFE_INTEGER
  if (aIndex !== bIndex) return aIndex - bIndex
  return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
}

/** Stable copy, sorted for display. */
export function sortQueueRows<T extends QueueSortable>(rows: readonly T[]): T[] {
  return [...rows].sort(compareQueueRows)
}
