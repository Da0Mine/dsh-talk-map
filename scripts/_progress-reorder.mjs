import fs from 'node:fs'
let t = fs.readFileSync('PROGRESS.md', 'utf8')
const start = t.indexOf('## 恢复块')
const end = t.indexOf('## 已完成')
if (start < 0 || end < 0 || end < start) throw new Error('blocks not found')
const restore = t.slice(start, end).trimEnd() + '\n\n'
t = t.slice(0, start) + t.slice(end)
// 插到「当前目标」之前
const goalAt = t.indexOf('## 当前目标')
t = t.slice(0, goalAt) + restore + t.slice(goalAt)
fs.writeFileSync('PROGRESS.md', t, 'utf8')
const lines = t.split('\n')
console.log('结构:', lines.filter(l => l.startsWith('## ')).join(' | '))
