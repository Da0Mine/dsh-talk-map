import fs from 'node:fs'
const f = 'src/client/session-activity.ts'
let t = fs.readFileSync(f, 'utf8')
const before = `      // A mark restored from storage is dropped as soon as the session is on
      // screen now — the shell had already acknowledged it, someone looked at it
      // while the app was closed, or (most often) it is the session the new start
      // restored. Runtime-made marks are never in \`hydrated\`, so they survive.
      if (hydrated.has(sessionId) && (row?.retainedBy?.mainView ?? 0) > 0) {
        hydrated.delete(sessionId)
        if (finished.delete(sessionId)) changed = true
        if (interrupted.delete(sessionId)) changed = true
      }
`
if (!t.includes(before)) throw new Error('hydrated clearing block missing')
t = t.replace(before, `      // Restored marks are NOT dropped just because the session is retained by the main view:
      // a restart reopens the previous sessions as main view, and that rule wiped every unread
      // lamp on every start. They are released by the two paths below, or by acknowledge().
`)
fs.writeFileSync(f, t, 'utf8')
console.log('session-activity: 不再因"主视图保留"清掉恢复的标记')
