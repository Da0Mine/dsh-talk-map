import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 置顶的最近卡提升到主列表：算 pinnedExtraRows
if (!t.includes('pinnedExtraRows')) {
  t = t.replace(
    `  const recentRenderedIds = recentRowsOrdered.map(row => row.sessionId)`,
    `  // Pinned recent sessions behave like queue rows: they move above the strip.
  const pinnedExtraRows = useMemo(() => recentRowsOrdered
    .filter(row => isPinnedSession(localPinSet, row.sessionId))
    .map(row => ({
      cardId: row.cardId,
      sessionId: row.sessionId,
      title: row.title,
      ...(row.updatedAt !== undefined ? { updatedAt: row.updatedAt, stamp: row.updatedAt } : {}),
      pinned: true,
    })), [recentRowsOrdered, localPinSet])
  const unpinnedRecentRows = recentRowsOrdered.filter(row => !isPinnedSession(localPinSet, row.sessionId))
  const recentRenderedIds = recentRowsOrdered.map(row => row.sessionId)`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: pinnedExtraRows')
}
