import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

const before = `  const recentRows = useMemo(() => computeRecentTasks({
    cards: Object.entries(canvasState.cards)
      .filter(([, card]) => (card as { boardId?: string }).boardId === 'inbox')
      .map(([cardId, card]) => ({ cardId, sessionId: card.sessionId })),`
const after = `  const recentRows = useMemo(() => {
    const boardCards = Object.entries(canvasState.cards)
      .filter(([, card]) => (card as { boardId?: string }).boardId === 'inbox')
      .map(([cardId, card]) => ({ cardId, sessionId: card.sessionId }))
    // Cards are created by the map's auto-sync, so a session that finished while the map was
    // closed has no card yet — which is why it vanished from this queue until the map was opened.
    // Synthesize an entry straight from the finish history: clicking it opens the session anyway.
    const onBoard = new Set(boardCards.map(card => card.sessionId))
    const synthetic = [...finishHistory.keys()]
      .filter(sessionId => !onBoard.has(sessionId))
      .map(sessionId => ({ cardId: sessionId, sessionId }))
    return computeRecentTasks({
      cards: [...boardCards, ...synthetic],`

if (!t.includes(before)) throw new Error('sidebar recentRows anchor missing')
t = t.replace(before, after)

// 收尾：原调用是多行对象，闭合处补上 useMemo 的依赖与返回值
t = t.replace(
  `    }).map(entry => ({ sessionId: entry.sessionId, cardId: entry.cardId, title: entry.title, ...(entry.updatedAt !== undefined ? { updatedAt: entry.updatedAt } : {}) })),
  [canvasState.cards, rows, sessions, finishHistory, readMarks, previews])`,
  `    }).map(entry => ({ sessionId: entry.sessionId, cardId: entry.cardId, title: entry.title, ...(entry.updatedAt !== undefined ? { updatedAt: entry.updatedAt } : {}) }))
  }, [canvasState.cards, rows, sessions, finishHistory, readMarks, previews])`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 最近任务补合成条目')
