/**
 * Move the routing helpers above their first use.
 *
 * `computedHandles` (line 1014) calls `sideHandles`, which was declared at 1318 —
 * `const` arrow functions throw when read before initialisation, so the whole map
 * failed to mount.
 */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

const start = lines.findIndex(line => line.includes('const routingObstacles = (): Obstacle[]'))
if (start < 0) {
  console.error('routing helpers missing')
  process.exit(1)
}
// the block runs until just before createLinkEdge's doc comment
const end = lines.findIndex((line, index) => index > start && line.includes('const createLinkEdge ='))
if (end <= start) {
  console.error('createLinkEdge not found')
  process.exit(1)
}
// walk back over the doc comment / blank lines that belong to createLinkEdge
let blockEnd = end - 1
while (blockEnd > start && lines[blockEnd].trim().startsWith('*')) blockEnd -= 1
while (blockEnd > start && lines[blockEnd].trim().startsWith('/**')) blockEnd -= 1
while (blockEnd > start && lines[blockEnd].trim() === '') blockEnd -= 1

const block = lines.slice(start, blockEnd + 1)
const rest = [...lines.slice(0, start), ...lines.slice(blockEnd + 1)]

const anchor = rest.findIndex(line => line.includes('const computedHandles = (fromCardId: string'))
if (anchor < 0) {
  console.error('computedHandles not found')
  process.exit(1)
}

const next = [...rest.slice(0, anchor), ...block, '', ...rest.slice(anchor)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log(`moved ${block.length} lines above line ${anchor + 1}`)
