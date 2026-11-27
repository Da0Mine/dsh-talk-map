import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
const at = lines.findIndex(line => line.includes('out.sort((a, b) => (b.updatedAt ?? 0)'))
if (at < 0) { console.log('未找到排序行'); process.exit(0) }
const indent = (lines[at].match(/^\s*/) ?? [''])[0]
lines[at] = `${indent}// Whoever was read last sits on top; completion time is only the fallback.`
lines.splice(at + 1, 0, `${indent}const seenAt = (sessionId: string): number => readMarks.get(sessionId) ?? finishHistory.get(sessionId) ?? 0`,
  `${indent}out.sort((a, b) => seenAt(b.sessionId) - seenAt(a.sessionId))`)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('SidebarQueue: 排序已插入第', at + 1, '行')
