/** Insert the drop-order check after the mid-drag yield check. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-dragorder.txt', 'utf8').replace(/\n$/, '').split('\n')

const at = lines.findIndex(line => line.includes("check('拖到邻居身上时，邻居在松手前就让位'"))
if (at < 0) {
  console.error('marker not found')
  process.exit(1)
}
let end = at
while (end < lines.length && !lines[end].trim().endsWith('（被拖卡片原位 ${firstCard.x}）`')) end += 1
const next = [...lines.slice(0, end + 1), '', ...block, ...lines.slice(end + 1)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`inserted after line ${end + 1}`)
