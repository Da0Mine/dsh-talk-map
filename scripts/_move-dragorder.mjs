/** Move the drop-order block to just before the summary. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
let lines = fs.readFileSync(probe, 'utf8').split('\n')

const start = lines.findIndex(line => line.includes('// ---- 7d. the drop must KEEP the yield it previewed'))
if (start < 0) {
  console.error('block not found')
  process.exit(1)
}
let end = start
while (end < lines.length && !lines[end].includes("check('松手后保留让位结果（不再弹回原位）', false, '没有两张可拖的卡片')")) end += 1
const block = lines.slice(start, end + 3) // include the closing brace of the else
lines = [...lines.slice(0, start), ...lines.slice(end + 3)]

const summary = lines.findIndex(line => line.includes('console.log(`\\n${results.length'))
if (summary < 0) {
  console.error('summary not found')
  process.exit(1)
}
const next = [...lines.slice(0, summary), ...block, '', ...lines.slice(summary)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`moved block to line ${summary + 1}`)
