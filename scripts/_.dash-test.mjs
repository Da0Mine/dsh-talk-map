/** The line is dashed again: fix the expectation. */
import fs from 'node:fs'

const file = 'test/edge-flow.test.mjs'
let source = fs.readFileSync(file, 'utf8')
const before = source

source = source.replace(
  "assert.ok(!/strokeDasharray: `\"6 5\"`/.test(bundle), 'the map line must no longer be dashed')",
  'assert.match(bundle, /strokeDasharray: "6 5"/, \'the line must be dashed again\')',
)
source = source.replace(
  "assert.ok(!/strokeDasharray/.test(bundle), 'the map line must no longer be dashed')",
  'assert.match(bundle, /strokeDasharray: "6 5"/, \'the line must be dashed again\')',
)

if (source === before) {
  console.error('anchor missing — dumping line 21')
  const lines = source.split(/\r?\n/)
  console.error(lines[19], '|', lines[20], '|', lines[21])
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('expectation fixed')
