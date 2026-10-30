/** Drop the orphaned drawer-search block (starts at `if (searchBoxPoint…`). */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')

const start = lines.findIndex(line => line.includes('if (searchBoxPoint !== null) {'))
if (start < 0) {
  console.error('start not found')
  process.exit(1)
}
// its closing brace is the first line that is exactly two spaces + }
let end = start
while (end < lines.length && lines[end] !== '  }') end += 1
if (end >= lines.length) {
  console.error('end not found')
  process.exit(1)
}
const next = [...lines.slice(0, start), ...lines.slice(end + 1)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`removed orphan block ${start + 1}..${end + 1}`)
