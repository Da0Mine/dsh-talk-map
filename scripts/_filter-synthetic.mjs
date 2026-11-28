import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

t = t.replace(
  `    const synthetic = [...finishHistory.keys()]
      .filter(sessionId => !onBoard.has(sessionId))
      .map(sessionId => ({ cardId: sessionId, sessionId }))`,
  `    const synthetic = [...finishHistory.keys()]
      .filter(sessionId => !onBoard.has(sessionId))
      // Only real sessions of the loaded list: subagent runs (dsh-mnemon spawns a lot of them,
      // e.g. "Mnemon · Idle review") and sessions from other workspaces have no business in a
      // user-facing queue — they were showing up as unexplained cards.
      .filter(sessionId => {
        const summary = sessions.byId[sessionId]
        if (summary === undefined) return false
        if (summary.origin === 'subagent') return false
        if (summary.blank === true) return false
        if (archivedSessionIds.has(sessionId)) return false
        return true
      })
      .map(sessionId => ({ cardId: sessionId, sessionId }))`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 合成条目只认真实会话')
