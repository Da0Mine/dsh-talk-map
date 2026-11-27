import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 更温和的批量
t = t.replace(
  `const PREVIEW_WARM_BATCH = 12
const PREVIEW_WARM_GAP_MS = 80`,
  `const PREVIEW_WARM_BATCH = 3
const PREVIEW_WARM_GAP_MS = 400
/** Never wait less than this, and never more: the Host reads a whole session surface per call. */
const PREVIEW_WARM_GAP_MIN = 400
const PREVIEW_WARM_GAP_MAX = 4000`,
)

// 2) 等会话列表加载完再预热；按耗时自适应间隔
t = t.replace(
  `    const ids = Object.values(visibleCards).map(card => card.sessionId)
    const todo = ids.filter(sessionId => !warmed.current.has(sessionId))
    if (todo.length === 0) return
    let cancelled = false
    const step = (): void => {
      if (cancelled) return
      const chunk = todo.splice(0, PREVIEW_WARM_BATCH)
      if (chunk.length === 0) return
      for (const sessionId of chunk) warmed.current.add(sessionId)
      void talkMapApi.lastUserMessages(chunk.map(sessionId => ({ id: sessionId })))`,
  `    // Wait for the session list: firing session-surface reads while it is still hydrating is what
    // starved the shell and left every card as a ghost for minutes.
    if (sessions.ids.length === 0) return
    const ids = Object.values(visibleCards).map(card => card.sessionId)
    const todo = ids.filter(sessionId => !warmed.current.has(sessionId))
    if (todo.length === 0) return
    let cancelled = false
    let gap = PREVIEW_WARM_GAP_MS
    const step = (): void => {
      if (cancelled) return
      const chunk = todo.splice(0, PREVIEW_WARM_BATCH)
      if (chunk.length === 0) return
      for (const sessionId of chunk) warmed.current.add(sessionId)
      const startedAt = Date.now()
      void talkMapApi.lastUserMessages(chunk.map(sessionId => ({ id: sessionId })))`,
)
t = t.replace(
  `        .catch(() => undefined)
        .finally(() => { if (!cancelled) setTimeout(step, PREVIEW_WARM_GAP_MS) })`,
  `        .catch(() => undefined)
        .finally(() => {
          // Back off when the Host is slow: three surface reads already take a while, and
          // hammering the queue makes the whole shell feel stuck.
          gap = Math.min(PREVIEW_WARM_GAP_MAX, Math.max(PREVIEW_WARM_GAP_MIN, (Date.now() - startedAt) * 4))
          if (!cancelled) setTimeout(step, gap)
        })`,
)
t = t.replace(
  `  }, [visibleCards])

  /**`,
  `  }, [visibleCards, sessions.ids.length])

  /**`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('预热改成温和串行 + 等会话列表')
