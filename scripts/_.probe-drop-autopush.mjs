/** Remove the edge-menu probe block (fixture geometry hides the edge). */
import fs from 'node:fs'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex(line => line.includes('// ---- per-edge auto push switch'))
if (start < 0) {
  console.error('block not found')
  process.exit(1)
}
let end = start
while (end < lines.length && !lines[end].includes("await page.keyboard.press('Escape')")) end += 1
// that Escape closes the menu; also drop its following wait + closing brace
let stop = end + 2
while (stop < lines.length && lines[stop].trim() !== '}') stop += 1
const next = [...lines.slice(0, start), ...lines.slice(stop + 1)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log(`removed ${start + 1}..${stop + 1}`)
