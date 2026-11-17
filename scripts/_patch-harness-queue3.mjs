import fs from 'node:fs'
const file = 'test/harness.js'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes("const sessions = payload.sessions ?? []"))
if (at < 0) { console.log('anchor missing'); process.exit(1) }
lines[at] = lines[at].replace('const sessions = payload.sessions ?? []', '// 会话摘要在 sessionsState.byId 里，不在 payload 上\n        const byId = sessionsState?.byId ?? {}')
const next = lines.findIndex((l, i) => i > at && l.includes('sessions.find(item => item.sessionId === sessionId)'))
if (next < 0) { console.log('find line missing'); process.exit(1) }
lines[next] = lines[next].replace('sessions.find(item => item.sessionId === sessionId)', 'byId[sessionId]')
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('stub fixed at', at + 1, '/', next + 1)
