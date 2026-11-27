import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

if (!t.includes('warmPreviews')) {
  t = t.replace(
    `  // Cards only exist after the canvas finishes loading: kick the request the
  // moment the set changes instead of waiting for the next poll tick.
  useEffect(() => { previewTick.current() }, [visibleCards])`,
    `  // Cards only exist after the canvas finishes loading: kick the request the
  // moment the set changes instead of waiting for the next poll tick.
  useEffect(() => { previewTick.current() }, [visibleCards])

  /**
   * Startup warm-up: pull every card's last user message right away, in chunks, instead of the
   * four-per-tick drip. The drip is for a thousand-card board; on load it just meant the rail sat
   * there with titles only for half a minute.
   */
  const warmed = useRef(new Set<string>())
  useEffect(() => {
    const ids = Object.values(visibleCards).map(card => card.sessionId)
    const todo = ids.filter(sessionId => !warmed.current.has(sessionId))
    if (todo.length === 0) return
    let cancelled = false
    const step = (): void => {
      if (cancelled) return
      const chunk = todo.splice(0, PREVIEW_WARM_BATCH)
      if (chunk.length === 0) return
      for (const sessionId of chunk) warmed.current.add(sessionId)
      void talkMapApi.lastUserMessages(chunk.map(sessionId => ({ id: sessionId })))
        .then(({ texts }) => {
          const cleaned: Record<string, string> = {}
          for (const [sessionId, text] of Object.entries(texts)) {
            putPreview(sessionId, text, 0)
            const value = cleanPreviewText(text).slice(0, 240)
            if (value !== '') cleaned[sessionId] = value
          }
          if (!cancelled && Object.keys(cleaned).length > 0) {
            setPreviews(previous => ({ ...previous, ...cleaned }))
          }
        })
        .catch(() => undefined)
        .finally(() => { if (!cancelled) setTimeout(step, PREVIEW_WARM_GAP_MS) })
    }
    step()
    return () => { cancelled = true }
  }, [visibleCards])`,
  )
  t = t.replace(
    `const PREVIEW_INTERVAL_MS = 4000`,
    `const PREVIEW_INTERVAL_MS = 4000
/** Startup warm-up: how many sessions per request, and the pause between chunks. */
const PREVIEW_WARM_BATCH = 12
const PREVIEW_WARM_GAP_MS = 80`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 启动预热全部预览')
}
