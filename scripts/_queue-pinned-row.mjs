import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `        ...(manual >= 0 ? { manualIndex: manual } : {}),`,
  `        ...(manual >= 0 ? { manualIndex: manual } : {}),
        ...(pinnedSessions.has(sessionId) ? { pinned: true } : {}),`,
)
t = t.replace(
  `  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds, queueOrder])`,
  `  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds, queueOrder, pinnedSessions])`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: rows 带 pinned')
