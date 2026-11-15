import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// 1) 取出 head 四行（1-based 371..374）
const headStart = lines.findIndex(l => l.includes("styles['statusRailHead']"))
if (headStart < 0) { console.log('head not found'); process.exit(1) }
const headEnd = headStart + 3
if (!lines[headEnd].trim().startsWith('</div>')) { console.log('head end unexpected:', lines[headEnd]); process.exit(1) }
const head = lines.splice(headStart, headEnd - headStart + 1)

// 2) 插到当前区块之后（原来是 : null} 那一行之后）
const anchor = lines.findIndex(l => l.trim() === ': null}')
if (anchor < 0) { console.log('current block end not found'); process.exit(1) }
lines.splice(anchor + 1, 0, ...head)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('head moved after the current block')
