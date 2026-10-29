/** Move the drop-order block inside the try (before the no-errors check). */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
let lines = fs.readFileSync(probe, 'utf8').split('\n')

const start = lines.findIndex(line => line.includes('// ---- 7d. the drop must KEEP the yield it previewed'))
if (start < 0) {
  console.error('block not found')
  process.exit(1)
}
let end = start
while (end < lines.length && !lines[end].includes("check('松手后保留让位结果（不再弹回原位）', false, '没有两张可拖的卡片')")) end += 1
// the block ends with the else-closing brace a couple of lines later
let blockEnd = end
while (blockEnd < lines.length && lines[blockEnd].trim() !== '}') blockEnd += 1
const block = lines.slice(start, blockEnd + 1)
const rest = [...lines.slice(0, start), ...lines.slice(blockEnd + 1)]

// insert before "// ---- 15. no runtime errors"
const at = rest.findIndex(line => line.includes('// ---- 15. no runtime errors'))
if (at < 0) {
  console.error('anchor not found')
  process.exit(1)
}
const next = [...rest.slice(0, at), ...block, '', ...rest.slice(at)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`moved ${block.length} lines to before line ${at + 1}`)
