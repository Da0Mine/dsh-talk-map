/** Replace the previously inserted 11b block with the prepared one. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-block.txt', 'utf8').replace(/\n$/, '').split('\n')

const start = lines.findIndex(line => line.includes('// ---- 11b. the stack drawer mirrors the canvas selection'))
if (start < 0) {
  console.error('start not found')
  process.exit(1)
}
// the old block ends right before the batch delete click
let end = start
while (end < lines.length && !lines[end].includes('const target = [...document.querySelectorAll(\'[class*="tm_batchAction"]\')]')) end += 1
if (end >= lines.length) {
  console.error('end not found')
  process.exit(1)
}
// keep the two comment lines that introduce the delete click
while (end > start && lines[end - 1].trim() === '') end -= 1
const next = [...lines.slice(0, start), ...block, ...lines.slice(end)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`replaced ${start + 1}..${end + 1}`)
