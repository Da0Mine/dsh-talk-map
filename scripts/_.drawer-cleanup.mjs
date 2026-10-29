/** Remove the drawer's leftover peek block (SearchResults owns the popover now). */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex(line => line.trim() === '{peek !== null')
if (start < 0) {
  console.error('peek block not found')
  process.exit(1)
}
let end = start
while (end < lines.length && lines[end].trim() !== ': null}') end += 1
lines.splice(start, end - start + 1)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log(`removed leftover peek block ${start + 1}..${end + 1}`)
