import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
// 找出 cardNodes 里我们插入的那段
const at = lines.findIndex(l => l.includes('待发送优先：卡片正文显示草稿本身'))
if (at < 0) { console.log('block not found'); process.exit(1) }
console.log('当前实现:')
for (let i = at; i < at + 4; i += 1) console.log(String(i + 1).padStart(4), lines[i])
