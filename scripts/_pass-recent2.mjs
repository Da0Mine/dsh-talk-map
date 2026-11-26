import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
const start = lines.findIndex(line => line.includes('<StatusRail'))
if (start < 0) throw new Error('StatusRail not found')
// 找到该元素结束的 "/>" 行
let end = start
while (end < lines.length && !lines[end].includes('/>')) end += 1
const block = lines.slice(start, end + 1)
if (block.some(line => line.includes('recent={recentEntries}'))) {
  console.log('already patched')
} else {
  const closeIndex = end
  lines.splice(closeIndex, 0, '        recent={recentEntries}', '        currentSessionId={currentSessionId()}')
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('inserted props at line', closeIndex + 1)
}
