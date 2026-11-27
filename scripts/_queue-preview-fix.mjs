import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) askedRef 记录 stamp，会话更新后会重新拉
t = t.replace(
  `  const askedRef = useRef<Set<string>>(new Set())`,
  `  /** sessionId → the stamp we already asked for; a newer stamp means ask again. */
  const askedRef = useRef<Map<string, number>>(new Map())`,
)
t = t.replace(
  `    const wanted = [...rows, ...recentRows]
      .slice(0, PREVIEW_LIMIT + 3)
      .filter(row => !askedRef.current.has(row.sessionId))
      .map(row => ({ id: row.sessionId, stamp: row.updatedAt ?? 0 }))
    if (wanted.length === 0) return
    for (const item of wanted) askedRef.current.add(item.id)`,
  `    // Queue rows and recent rows get their own budgets: slicing the concatenation meant the
    // recent cards were the first thing dropped, which is why they showed no text at all.
    const pick = (list: readonly { sessionId: string; updatedAt?: number }[], cap: number): { id: string; stamp: number }[] =>
      list
        .slice(0, cap)
        .map(row => ({ id: row.sessionId, stamp: row.updatedAt ?? 0 }))
        .filter(item => askedRef.current.get(item.id) !== item.stamp)
    const wanted = [...pick(rows, PREVIEW_LIMIT), ...pick(recentRows, 10)]
    if (wanted.length === 0) return
    for (const item of wanted) askedRef.current.set(item.id, item.stamp)`,
)
t = t.replace(
  `      .catch(() => { for (const id of wanted) askedRef.current.delete(id) })`,
  `      .catch(() => { for (const item of wanted) askedRef.current.delete(item.id) })`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 预览分批 + stamp 去重')
