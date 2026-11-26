import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) import
t = t.replace(
  `import { sortQueueRows } from './queue-order.ts'`,
  `import { sortQueueRows } from './queue-order.ts'\nimport { useReorder } from './reorder.ts'`,
)

// 2) 顺序状态 + 拖拽
t = t.replace(
  `  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set())`,
  `  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set())
  /** Manual order for the queue rows (inside each priority bucket) and for the recent strip. */
  const [queueOrder, setQueueOrder] = useState<string[]>([])
  const [recentOrder, setRecentOrder] = useState<string[]>([])`,
)

// 3) rows 里带上 manualIndex
t = t.replace(
  `      out.push({
        cardId: cardBySession.get(sessionId) ?? sessionId,
        sessionId,`,
  `      const manual = queueOrder.indexOf(sessionId)
      out.push({
        cardId: cardBySession.get(sessionId) ?? sessionId,
        sessionId,
        ...(manual >= 0 ? { manualIndex: manual } : {}),`,
)
t = t.replace(
  `  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds])`,
  `  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds, queueOrder])`,
)

// 4) 顺序同步 + 两个拖拽实例
t = t.replace(
  `  const activeSession = currentSessionId()`,
  `  const activeSession = currentSessionId()

  const queueIds = rows.map(row => row.sessionId)
  useEffect(() => {
    setQueueOrder(current => {
      const kept = current.filter(id => queueIds.includes(id))
      const added = queueIds.filter(id => !kept.includes(id))
      const next = [...kept, ...added]
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueIds.join('|')])
  const queueDrag = useReorder(queueIds, setQueueOrder)

  const recentIds = recentRows.map(row => row.sessionId)
  useEffect(() => {
    setRecentOrder(current => {
      const kept = current.filter(id => recentIds.includes(id))
      const added = recentIds.filter(id => !kept.includes(id))
      const next = [...kept, ...added]
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentIds.join('|')])
  const recentDrag = useReorder(recentIds, setRecentOrder)
  const recentRowsOrdered = useMemo(() => {
    const byId = new Map(recentRows.map(row => [row.sessionId, row]))
    const ordered = recentOrder.map(id => byId.get(id)).filter((row): row is (typeof recentRows)[number] => row !== undefined)
    for (const row of recentRows) if (!recentOrder.includes(row.sessionId)) ordered.push(row)
    return ordered
  }, [recentRows, recentOrder])`,
)

// 5) 预览请求覆盖最近区
t = t.replace(
  `    const wanted = rows
      .slice(0, PREVIEW_LIMIT)`,
  `    const wanted = [...rows, ...recentRows]
      .slice(0, PREVIEW_LIMIT + 3)`,
)
t = t.replace(
  `  }, [rows])`,
  `  }, [rows, recentRows])`,
)

fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 顺序状态 + 拖拽 + 预览覆盖最近区')
