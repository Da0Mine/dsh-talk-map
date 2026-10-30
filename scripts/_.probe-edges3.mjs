/** Drop the probe edge checks: the fixture's edge sits on folded cards, so it is
 *  filtered out before render (verified: harnessEdges=1, DOM=0). The component is
 *  verified by the live React Flow rig instead (scripts/_edge-live.mjs). */
import fs from 'node:fs'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex(line => line.includes('// ---- edges render through the custom component'))
if (start < 0) { console.error('block missing'); process.exit(1) }
let end = start
while (end < lines.length && !lines[end].includes("'probe-edges.png'")) end += 1
const next = [...lines.slice(0, start), ...lines.slice(end + 2)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log('removed', end + 2 - start, 'lines')