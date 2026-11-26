import fs from 'node:fs'
const f = 'src/client/session-activity.ts'
let t = fs.readFileSync(f, 'utf8')
const anchor = `      const unread = fact?.completionUnread
      const previousUnread = lastUnread.get(sessionId)
      if (typeof unread === 'boolean') lastUnread.set(sessionId, unread)`
const added = `      const unread = fact?.completionUnread
      const previousUnread = lastUnread.get(sessionId)
      if (typeof unread === 'boolean') lastUnread.set(sessionId, unread)
      // The shell flags a completion as unread whenever the session was not on screen — that
      // mark is NOT persisted by the host, so a restart lost every lamp for sessions the user
      // had not opened yet. Import it into our own store so it survives.
      if (unread === true && !finished.has(sessionId)) {
        finished.add(sessionId)
        markedEpoch.set(sessionId, panelEpoch)
        changed = true
      }`
if (!t.includes(anchor)) throw new Error('observe anchor missing')
t = t.replace(anchor, added)
fs.writeFileSync(f, t, 'utf8')
console.log('session-activity: 宿主未读也纳入持久化')
