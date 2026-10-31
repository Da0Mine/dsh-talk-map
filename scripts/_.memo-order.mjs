/** `drawerWireLinks` reads `liveEdges`, so it has to be declared after it. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

const memoAt = lines.findIndex(line => line.includes('const drawerWireLinks = useMemo'))
if (memoAt < 0) {
  console.error('memo missing')
  process.exit(1)
}
let from = memoAt
while (from > 0 && !lines[from - 1].trim().startsWith('/**')) from -= 1
from -= 1
let end = memoAt
while (end < lines.length && !lines[end].includes('}, [drawer, folderLayouts')) end += 1

const block = lines.slice(from, end + 1)
const rest = [...lines.slice(0, from), ...lines.slice(end + 1)]

// insert right after the liveEdges memo ends
const liveAt = rest.findIndex(line => line.includes('const liveEdges = useMemo'))
if (liveAt < 0) {
  console.error('liveEdges missing')
  process.exit(1)
}
let liveEnd = liveAt
while (liveEnd < rest.length && !/^ {2}\}, \[/.test(rest[liveEnd])) liveEnd += 1
if (liveEnd >= rest.length) {
  console.error('liveEdges end missing')
  process.exit(1)
}

const out = [...rest.slice(0, liveEnd + 1), '', ...block, ...rest.slice(liveEnd + 1)]
fs.writeFileSync(file, out.join('\n'), 'utf8')
console.log(`moved drawerWireLinks below liveEdges (line ${liveEnd + 2})`)
