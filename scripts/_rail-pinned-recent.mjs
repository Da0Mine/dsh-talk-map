import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
// 置顶的最近卡浮到列表最前：渲染 [...pinnedRecent, ...ordered]
if (!t.includes('pinnedRecentEntries')) {
  t = t.replace(
    `  const recentRenderedIds = recentEntriesOrdered.map(entry => entry.cardId)`,
    `  // Pinned cards leave the「最近的任务」strip and float to the very top of the list.
  const pinnedRecentEntries = recentEntriesOrdered.filter(entry => isPinnedSession(localPinSet, entry.sessionId))
  const unpinnedRecentEntries = recentEntriesOrdered.filter(entry => !isPinnedSession(localPinSet, entry.sessionId))
  const recentRenderedIds = recentEntriesOrdered.map(entry => entry.cardId)`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: pinnedRecent 计算')
}
