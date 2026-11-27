import fs from 'node:fs'

// ---------- MapCanvas 用共享计算 ----------
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const start = t.indexOf('  const recentEntries = useMemo<StatusRailEntry[]>(() => {')
  const end = t.indexOf('  }, [visibleCards, sessions, statusEntries, renamedTitles, previews, finishHistory, readMarks])', start)
  if (start < 0 || end < 0) throw new Error('recentEntries block not found')
  const block = `  const recentEntries = useMemo<StatusRailEntry[]>(() => computeRecentTasks({
    cards: Object.entries(visibleCards)
      .filter(([, card]) => card.boardId === INBOX_BOARD_ID)
      .map(([cardId, card]) => ({ cardId, sessionId: card.sessionId })),
    listed: new Set(statusEntries.map(entry => entry.sessionId)),
    history: finishHistory,
    readMarks,
    title: sessionId => renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? sessionId,
    updatedAt: sessionId => sessions.byId[sessionId]?.updatedAt,
    preview: sessionId => previews[sessionId],
    limit: MAX_RECENT_TASKS,
  }), [visibleCards, sessions, statusEntries, renamedTitles, previews, finishHistory, readMarks])`
  t = t.slice(0, start) + block + t.slice(end + '  }, [visibleCards, sessions, statusEntries, renamedTitles, previews, finishHistory, readMarks])'.length)
  if (!t.includes("from './recent-tasks.ts'")) {
    t = t.replace(/^import /m, `import { computeRecentTasks } from './recent-tasks.ts'\nimport `)
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 共享计算')
}

// ---------- SidebarQueue 用共享计算 ----------
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const start = t.indexOf('  const recentRows = useMemo(() => {')
  const end = t.indexOf('  }, [rows, sessions, archivedSessionIds, finishHistory, readMarks])', start)
  if (start < 0 || end < 0) throw new Error('sidebar recentRows block not found')
  const block = `  // Same computation as the map rail — one source, so the two lists cannot disagree.
  const recentRows = useMemo(() => computeRecentTasks({
    cards: Object.entries(canvasState.cards)
      .filter(([, card]) => (card as { boardId?: string }).boardId === 'inbox')
      .map(([cardId, card]) => ({ cardId, sessionId: card.sessionId })),
    listed: new Set(rows.map(row => row.sessionId)),
    history: finishHistory,
    readMarks,
    title: sessionId => sessions.byId[sessionId]?.displayTitle ?? sessionId,
    updatedAt: sessionId => sessions.byId[sessionId]?.updatedAt,
    preview: sessionId => previews[sessionId],
    limit: MAX_RECENT_TASKS,
  }).map(entry => ({ sessionId: entry.sessionId, cardId: entry.cardId, title: entry.title, ...(entry.updatedAt !== undefined ? { updatedAt: entry.updatedAt } : {}) })),
  [canvasState.cards, rows, sessions, finishHistory, readMarks, previews])`
  t = t.slice(0, start) + block + t.slice(end + '  }, [rows, sessions, archivedSessionIds, finishHistory, readMarks])'.length)
  if (!t.includes("from './recent-tasks.ts'")) {
    t = t.replace(/^import /m, `import { computeRecentTasks } from './recent-tasks.ts'\nimport `)
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 共享计算')
}
