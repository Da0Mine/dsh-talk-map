import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// 残片：从孤儿 cardFooter 到那行 : null}
const start = lines.findIndex((l, i) => i > 350 && l.includes("styles['cardFooter']") && lines[i + 1]?.includes('props.current'))
if (start < 0) { console.log('leftover start not found'); process.exit(1) }
let end = start
while (end < lines.length && lines[end].trim() !== ': null}') end += 1
if (end >= lines.length) { console.log('leftover end not found'); process.exit(1) }
console.log('删除行范围:', start + 1, '..', end + 1)
lines.splice(start, end - start + 1)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
const rest = lines.filter(l => l.includes('props.current') || l.includes('statusRailCurrent')).length
console.log('残留引用:', rest)
