/** Insert the hover-peek checks after the highlight check. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-peek.txt', 'utf8').replace(/\n$/, '').split('\n')

const at = lines.findIndex(line => line.includes('结果里的搜索词高亮'))
if (at < 0) {
  console.error('marker not found')
  process.exit(1)
}
let end = at
while (end < lines.length && !lines[end].trim().endsWith('JSON.stringify(groupedHits.markText))')) end += 1
const next = [...lines.slice(0, end + 1), ...block, ...lines.slice(end + 1)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`inserted after line ${end + 1}`)
