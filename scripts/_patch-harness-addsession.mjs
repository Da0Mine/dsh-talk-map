import fs from 'node:fs'
const f = 'test/harness.js'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('addSession(workspaceId, sessionId, title, options)')) {
  t = t.replace(
    `    addSession(workspaceId, sessionId, title) {
      sessionRows[sessionId] = session(sessionId, title, { updatedAt: Date.now() })`,
    `    addSession(workspaceId, sessionId, title, options) {
      sessionRows[sessionId] = session(sessionId, title, { updatedAt: Date.now(), ...(options || {}) })`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('harness: addSession accepts options (e.g. {running:true})')
}
