import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 1) 撤掉误插到 ReactFlow 里的两行
lines = lines.filter(line => !line.trim().startsWith('recent={recentEntries}') && !line.trim().startsWith('currentSessionId={currentSessionId()}'))

// 2) 精确定位 <StatusRail ... /> 并插入
const start = lines.findIndex(line => line.trim() === '<StatusRail')
if (start < 0) throw new Error('StatusRail element not found')
let end = start
while (end < lines.length && lines[end].trim() !== '/>') end += 1
if (end >= lines.length) throw new Error('StatusRail close not found')
lines.splice(end, 0, '        recent={recentEntries}', '        currentSessionId={currentSessionId()}')
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('inserted into StatusRail at line', end + 1)
