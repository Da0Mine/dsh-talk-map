/** Replace 11b with the drawer-persistence check, keeping the batch delete. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const blockPath = 'scripts/_probe-block.txt'
const block = fs.readFileSync(blockPath, 'utf8').replace(/\n$/, '').split('\n')

const start = lines.findIndex(line => line.includes('// ---- 11b. the stack drawer mirrors the canvas selection'))
const target = lines.findIndex(line => line.includes('\'[class*="tm_batchAction"]\''))
if (start < 0 || target < start) {
  console.error('markers not found', start, target)
  process.exit(1)
}
// walk back from the delete click to its `await page.evaluate(() => {` opener
let end = target
while (end > start && !lines[end].includes('await page.evaluate(() => {')) end -= 1
const next = [...lines.slice(0, start), ...block, '', ...lines.slice(end)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`replaced ${start + 1}..${end}`)
