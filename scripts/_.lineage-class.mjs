/**
 * A lineage line only got its `tmEdge-lineage` class while it was `idle`, so a
 * synced or stale one was painted with the INJECTION edge style (solid, wider,
 * glowing) — the same kind of line looked completely different from one card pair
 * to the next. The lineage marker is structural, not a state: it must always be
 * present, and only the colour may change with the state.
 */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

const old = J([
  '        className: `tmEdge tmEdge-${lineageSync}`',
  "          + (lineageSync === 'idle' ? ' tmEdge-lineage' : ''),",
])
const next = J([
  '        // Structural marker, never conditional: a lineage line must look like a',
  '        // lineage line in every state — only its colour changes.',
  '        className: `tmEdge tmEdge-${lineageSync} tmEdge-lineage`,',
])
if (!source.includes(old)) {
  console.error('className anchor missing')
  process.exit(1)
}
source = source.replace(old, next)
fs.writeFileSync(file, source, 'utf8')
console.log('lineage class is now unconditional')
