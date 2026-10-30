/**
 * Move the busy-delete check to AFTER the stack-drawer block: deleting a card
 * changes what that folder contains, which the drawer assertions count.
 */
import fs from 'node:fs'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')

const start = lines.findIndex(line => line.includes('// A session that still has work must be stopped, then moved'))
if (start < 0) {
  console.error('block not found')
  process.exit(1)
}
let end = start
while (end < lines.length && !lines[end].includes("JSON.stringify(busyDelete))")) end += 1
const block = lines.slice(start, end + 1)
const rest = [...lines.slice(0, start), ...lines.slice(end + 1)]

// insert before the restart section
const anchor = rest.findIndex(line => line.includes('// s4 finishes (green), s5 is still running when we "quit"'))
if (anchor < 0) {
  console.error('anchor not found')
  process.exit(1)
}
const next = [...rest.slice(0, anchor), ...block, '', ...rest.slice(anchor)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log(`moved ${block.length} lines to before line ${anchor + 1}`)
