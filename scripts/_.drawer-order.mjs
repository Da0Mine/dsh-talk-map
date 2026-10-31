/** Move `drawerLinks` above `drawerWireLinks` (TDZ again: const before init throws). */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

const fnStart = lines.findIndex(line => line.includes('const drawerLinks = (cardIds'))
if (fnStart < 0) {
  console.error('drawerLinks missing')
  process.exit(1)
}
// its doc comment starts a few lines up
let docStart = fnStart
while (docStart > 0 && !lines[docStart - 1].trim().startsWith('/**')) docStart -= 1
docStart -= 1

let fnEnd = fnStart
while (fnEnd < lines.length && lines[fnEnd] !== '  }') fnEnd += 1

const block = lines.slice(docStart, fnEnd + 1)
const rest = [...lines.slice(0, docStart), ...lines.slice(fnEnd + 1)]

const anchor = rest.findIndex(line => line.includes('const drawerWireLinks = useMemo'))
if (anchor < 0) {
  console.error('drawerWireLinks missing')
  process.exit(1)
}

const out = [...rest.slice(0, anchor), ...block, '', ...rest.slice(anchor)]
fs.writeFileSync(file, out.join('\n'), 'utf8')
console.log(`moved drawerLinks (${block.length} lines) above drawerWireLinks`)
