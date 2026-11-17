import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// 取出预览 effect（在 rows 之前会 TDZ：deps 数组在 render 时就求值）
const start = lines.findIndex(l => l.includes('const wanted = rows'))
if (start < 0) { console.log('effect not found'); process.exit(1) }
let from = start
while (from > 0 && !lines[from].trim().startsWith('useEffect(() => {')) from -= 1
let to = start
while (to < lines.length && !lines[to].includes('}, [rows])')) to += 1
if (to >= lines.length) { console.log('effect end not found'); process.exit(1) }
const block = lines.slice(from, to + 1)
lines.splice(from, to - from + 1)

// 插到 rows memo 结束之后
const memoEnd = lines.findIndex(l => l.includes('}, [canvasState.cards, sessions, drafts])'))
if (memoEnd < 0) { console.log('memo end not found'); process.exit(1) }
lines.splice(memoEnd + 1, 0, '', ...block, '')
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('preview effect moved after the rows memo (line', memoEnd + 2, ')')
