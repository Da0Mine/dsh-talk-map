import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
const decl = lines.findIndex(line => line.includes('const pinnedSessions = useMemo'))
if (decl < 0) throw new Error('pinnedSessions decl not found')
const [removed] = lines.splice(decl, 1)
const rowsAt = lines.findIndex(line => line.includes('const rows = useMemo('))
if (rowsAt < 0) throw new Error('rows memo not found')
// 插到 rows 之前（连同注释行）
lines.splice(rowsAt - 2, 0, removed)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('把 pinnedSessions 提到 rows 之前')
