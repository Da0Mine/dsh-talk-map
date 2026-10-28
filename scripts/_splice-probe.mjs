/** Splice the prepared drop-test block into probe.mjs between two markers. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-block.txt', 'utf8').replace(/\n$/, '').split('\n')

let start = -1
let end = -1
for (let i = 0; i < lines.length; i += 1) {
  if (start < 0 && lines[i].includes('const frameLabel2 = await box(')) start = i
  if (start >= 0 && lines[i].includes("check('拖进别的文件夹会把对方弹开") ) end = i
}
if (start < 0 || end < start) {
  console.error('markers not found', start, end)
  process.exit(1)
}
// the old block ends with the closing paren of that check plus the overlap eval tail
while (end < lines.length && !lines[end].includes('JSON.stringify(overlapPairs))')) end += 1
if (end >= lines.length) {
  console.error('end of old block not found')
  process.exit(1)
}
const next = [...lines.slice(0, start), ...block, ...lines.slice(end + 1)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`replaced lines ${start + 1}..${end + 1} with ${block.length} lines`)
