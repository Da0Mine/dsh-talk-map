import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 常量
if (!t.includes('MAX_RECENT_TASKS')) {
  t = t.replace(
    `import { sortQueueRows } from './queue-order.ts'`,
    `import { sortQueueRows } from './queue-order.ts'\nimport { MAX_RECENT_TASKS, RECENT_PAGE_SIZE } from './StatusRail.tsx'`,
  )
}
// 2) 窗口上限
t = t.replace(`    return out.slice(0, 3)`, `    return out.slice(0, MAX_RECENT_TASKS)`)
// 3) 分页状态
t = t.replace(
  `  const [recentOrder, setRecentOrder] = useState<string[]>([])`,
  `  const [recentOrder, setRecentOrder] = useState<string[]>([])
  /** Mirrors the map rail: five visible, +5 per 「查看更多」 or bottom wheel. */
  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE_SIZE)`,
)
// 4) 可见列表
t = t.replace(
  `  const recentRenderedIds = recentRowsOrdered.map(row => row.sessionId)`,
  `  const visibleRecentRows = unpinnedRecentRows.slice(0, recentLimit)
  const hasMoreRecent = unpinnedRecentRows.length > visibleRecentRows.length
  const recentRenderedIds = recentRowsOrdered.map(row => row.sessionId)`,
)
// 5) 渲染用可见列表 + 按钮
t = t.replace(`                {recentRowsOrdered.map((row) => (`, `                {visibleRecentRows.map((row) => (`)
t = t.replace(
  `              {unpinnedRecentRows.length > 0`,
  `              {visibleRecentRows.length > 0`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 分页状态与可见列表')
