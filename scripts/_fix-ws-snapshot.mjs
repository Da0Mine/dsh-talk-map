import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
// 稳定的空快照：getSnapshot 每次返回新对象会让 useSyncExternalStore 无限重渲染（React #185）
t = t.replace(
  'const emptyWorkspaces = (): { archivedSessionIds?: readonly string[] } => ({})',
  'const EMPTY_WORKSPACES: { archivedSessionIds?: readonly string[] } = {}\nconst emptyWorkspaces = (): { archivedSessionIds?: readonly string[] } => EMPTY_WORKSPACES',
)
fs.writeFileSync(f, t, 'utf8')
console.log('stable empty snapshot')
