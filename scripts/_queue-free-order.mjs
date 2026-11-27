import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 排序：用户拖过的顺序优先，新行按优先级排在后面
t = t.replace(
  `    // Same rule as the map rail: priority bucket first, then newest inside it.
    return sortQueueRows(out)`,
  `    // The sidebar queue follows the user's own order once they drag: dragged rows keep their
    // place, rows that appeared later fall in behind by priority. Forcing the rail's priority
    // buckets here made a cross-bucket drag impossible — which looked like "no 让位 at all".
    const ranked = sortQueueRows(out)
    const byId = new Map(ranked.map(row => [row.sessionId, row]))
    const ordered = queueOrder.map(id => byId.get(id)).filter((row): row is (typeof ranked)[number] => row !== undefined)
    for (const row of ranked) if (!queueOrder.includes(row.sessionId)) ordered.push(row)
    return ordered`,
)

// 2) 去掉桶限制，允许自由换位
t = t.replace(
  `  // A drag may only reorder inside one priority bucket, matching the rail's rule.
  const bucketOfRow = useCallback((sessionId: string): number => {
    const row = rows.find(entry => entry.sessionId === sessionId)
    return row === undefined ? 0 : queueRank(row.lamp, row.draft === true, isPinnedSession(localPinSet, sessionId))
  }, [rows, pinnedSessions, localPinSet])
  const queueDrag = useReorder(queueIds, setQueueOrder, { bucketOf: bucketOfRow })`,
  `  // No bucket restriction here: the queue is a flat list and the user expects 让位 in both
  // directions, including across priorities.
  const queueDrag = useReorder(queueIds, setQueueOrder)`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 自由换位 + 用户顺序优先')
