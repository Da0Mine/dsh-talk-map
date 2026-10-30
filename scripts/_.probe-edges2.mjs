/** Move the edge checks earlier: later tests resize frames and fold the cards. */
import fs from 'node:fs'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex(line => line.includes('// ---- edges render through the custom component'))
if (start < 0) { console.error('block missing'); process.exit(1) }
let end = start
while (end < lines.length && !lines[end].includes("'probe-edges.png'")) end += 1
const block = lines.slice(start, end + 2)
const rest = [...lines.slice(0, start), ...lines.slice(end + 2)]

const anchor = rest.findIndex(line => line.includes('// ---- 11. pin / archive / delete / batch'))
if (anchor < 0) { console.error('anchor missing'); process.exit(1) }
const next = [...rest.slice(0, anchor), ...block, '', ...rest.slice(anchor)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log('moved', block.length, 'lines to before', anchor + 1)