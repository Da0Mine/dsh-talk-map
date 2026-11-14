import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

const start = lines.findIndex(line => line.includes('A rail tap opens that conversation'))
if (start < 0) { console.log('comment line not found'); process.exit(1) }
// the block is: comment, const..., }, deps..., blank
let end = start
while (end < lines.length && !(lines[end].trim() === '}, [visibleCards, openSession])')) end += 1
if (end >= lines.length) { console.log('block end not found'); process.exit(1) }
end += 1 // include the blank line
const removed = lines.splice(start, end - start + 1)

const target = lines.findIndex(line => line.includes('const openSearchHit = (sessionId: string)'))
if (target < 0) { console.log('openSearchHit not found'); process.exit(1) }
lines.splice(target, 0, ...removed)

fs.writeFileSync(file, lines.join('\n'), 'utf8')
const text = fs.readFileSync(file, 'utf8')
const a = text.indexOf('const openSession = (sessionId: string)')
const b = text.indexOf('const openRailCard')
console.log('openSession at', a, '| openRailCard at', b, '| order ok:', a > 0 && b > a)
