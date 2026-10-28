/** Append the prepared block right after a marker line in probe.mjs. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-block.txt', 'utf8').replace(/\n$/, '').split('\n')
const marker = "check('再点一张 → 勾选框变勾 + 计数 2'"

const at = lines.findIndex(line => line.includes(marker))
if (at < 0) {
  console.error('marker not found')
  process.exit(1)
}
const next = [...lines.slice(0, at + 1), '', ...block, ...lines.slice(at + 1)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`inserted after line ${at + 1}`)
