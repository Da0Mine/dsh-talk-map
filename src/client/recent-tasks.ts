/**
 * 「最近的任务」, computed once so the map rail and the sidebar queue cannot drift apart.
 *
 * They used to compute it from different sources — the rail from the board's cards, the queue from
 * the session list — which is why the two lists disagreed. The rule both must follow:
 *
 *   running → finished (待查看) → read → recent, newest read on top.
 *
 * Anything still lamped belongs to the queue above, so it is excluded here; anything that never
 * finished is excluded too (no history entry).
 */
export interface RecentTaskEntry {
  cardId: string
  sessionId: string
  title: string
  /** Timestamp used for sorting only. */
  stamp: number
  updatedAt?: number
  preview?: string
}

export interface RecentTaskInput {
  /** Board cards (already filtered to the inbox board by the caller). */
  cards: readonly { cardId: string; sessionId: string }[]
  /** Sessions shown in the queue above (pending lamps / drafts) — never repeated here. */
  listed: ReadonlySet<string>
  /** Sessions that have finished at least once. */
  history: ReadonlyMap<string, number>
  /** Session → when it was last read; falls back to the finish time. */
  readMarks: ReadonlyMap<string, number>
  title: (sessionId: string) => string
  updatedAt: (sessionId: string) => number | undefined
  preview: (sessionId: string) => string | undefined
  limit: number
}

export function computeRecentTasks(input: RecentTaskInput): RecentTaskEntry[] {
  const rows: RecentTaskEntry[] = []
  for (const card of input.cards) {
    if (input.listed.has(card.sessionId)) continue
    if (!input.history.has(card.sessionId)) continue
    const updatedAt = input.updatedAt(card.sessionId)
    const preview = input.preview(card.sessionId)
    rows.push({
      cardId: card.cardId,
      sessionId: card.sessionId,
      title: input.title(card.sessionId),
      stamp: updatedAt ?? 0,
      ...(updatedAt !== undefined ? { updatedAt } : {}),
      ...(preview !== undefined && preview !== '' ? { preview } : {}),
    })
  }
  const seenAt = (sessionId: string): number =>
    input.readMarks.get(sessionId) ?? input.history.get(sessionId) ?? 0
  rows.sort((a, b) => seenAt(b.sessionId) - seenAt(a.sessionId))
  return rows.slice(0, input.limit)
}
