import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 1) 最近区拖拽移到 recentRowsOrdered 之后，用渲染顺序
const at = lines.findIndex(line => line.includes('const recentDrag = useReorder(recentIds, setRecentOrder)'))
if (at < 0) throw new Error('recentDrag line not found')
lines.splice(at, 1)
const endAt = lines.findIndex(line => line.includes('}, [recentRows, recentOrder])'))
if (endAt < 0) throw new Error('recentRowsOrdered end not found')
lines.splice(endAt + 1, 0,
  '  const recentRenderedIds = recentRowsOrdered.map(row => row.sessionId)',
  '  const recentDrag = useReorder(recentRenderedIds, setRecentOrder)',
)

// 2) 主行拖拽按优先级桶限制
const queueAt = lines.findIndex(line => line.includes('const queueDrag = useReorder(queueIds, setQueueOrder)'))
if (queueAt < 0) throw new Error('queueDrag line not found')
lines[queueAt] = `  // A drag may only reorder inside one priority bucket, matching the rail's rule.
  const bucketOfRow = useCallback((sessionId: string): number => {
    const row = rows.find(entry => entry.sessionId === sessionId)
    return row === undefined ? 0 : queueRank(row.lamp, row.draft === true, pinnedSessions.has(sessionId))
  }, [rows, pinnedSessions])
  const queueDrag = useReorder(queueIds, setQueueOrder, { bucketOf: bucketOfRow })`

fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('SidebarQueue: 渲染顺序 + 桶限制')
