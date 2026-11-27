import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replaceAll(`isPinnedSession(localPinSet, row.title === "" ? '' : row.title)`, `isPinnedSession(localPinSet, row.sessionId)`)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: pin 条件改为 sessionId')
