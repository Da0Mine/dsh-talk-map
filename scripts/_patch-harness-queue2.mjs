import fs from 'node:fs'
const file = 'test/harness.js'
let text = fs.readFileSync(file, 'utf8')
const before = `  const sessionIds = Object.values(payload.cards ?? {}).map(card => card.sessionId)
  const sessions = payload.sessions ?? []
  const entries = sessionIds.map((sessionId, index) => {
    const summary = sessions.find(item => item.sessionId === sessionId)`
const after = `  const sessionIds = Object.values(payload.cards ?? {}).map(card => card.sessionId)
  // The demo keeps session summaries in sessionsState.byId, not payload.sessions.
  const byId = sessionsState?.byId ?? {}
  const entries = sessionIds.map((sessionId, index) => {
    const summary = byId[sessionId]`
if (!text.includes(before)) { console.log('stub anchor missing'); process.exit(1) }
text = text.replace(before, after)
fs.writeFileSync(file, text, 'utf8')
console.log('harness stub uses sessionsState.byId')
