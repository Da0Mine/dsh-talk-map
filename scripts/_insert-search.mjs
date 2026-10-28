/** Insert the drawer-search checks right after the reticle check (drawer open). */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-block.txt', 'utf8').replace(/\n$/, '').split('\n')

const at = lines.findIndex(line => line.includes("check('堆叠抽屉里也标出当前对话（选中样式）'"))
if (at < 0) {
  console.error('anchor not found')
  process.exit(1)
}
// the check spans two lines; insert after its closing line
let end = at
while (end < lines.length && !lines[end].trim().endsWith('JSON.stringify(drawerCurrent))')) end += 1
const next = [...lines.slice(0, end + 1), '', ...block, ...lines.slice(end + 1)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`inserted after line ${end + 1}`)
