/** Repair the two-line insertion that ended up on one physical line. */
import fs from 'node:fs'

const file = 'test/grid.test.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const index = lines.findIndex(line => line.includes('a single-slot folder shows its one card'))
if (index < 0) {
  console.error('line not found')
  process.exit(1)
}
lines[index] = "  assert.equal(visibleCount(1, 1), 1, 'a single-slot folder shows its one card')"
lines.splice(index + 1, 0, "  assert.equal(visibleCount(1, 5), 0, 'a single-slot folder that overflows IS the stack cell')")
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('repaired')
