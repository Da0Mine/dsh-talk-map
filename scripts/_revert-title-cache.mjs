import fs from 'node:fs'

// ---------- MapCanvas：撤掉 title-cache / card-cache ----------
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')

  // import
  t = t.replace(`import { putTitle, readTitles } from './title-cache.ts'\n`, '')
  t = t.replace(`import { putCards, readCards } from './card-cache.ts'\n`, '')

  // 缓存卡片 state + 写回
  t = t.replace(
    `  /** Card projection from the last run: paints the rail before /talk-map/state returns. */
  const cachedCards = useMemo<Record<string, Card>>(() => readCards(), [])
  useEffect(() => { putCards(canvasState.cards) }, [canvasState.cards])

`, '')
  t = t.replace(`      // Start from the last snapshot so the rail has something to draw while the Host answers;
      // real cards overwrite their cached twins below.
      const out: Record<string, Card> = { ...cachedCards }`,
    `      const out: Record<string, Card> = {}`)
  t = t.replace(`    }, [canvasState.cards, sessions, archivedSessionIds, cachedCards])`,
    `    }, [canvasState.cards, sessions, archivedSessionIds])`)

  // 标题缓存 state + 回写 effect
  t = t.replace(
    `  /** Titles known from the last run: they paint before the session list hydrates. */
  const [cachedTitles, setCachedTitles] = useState<Record<string, string>>(readTitles)
  useEffect(() => {
    setCachedTitles(current => {
      let changed = false
      const next = { ...current }
      for (const [sessionId, summary] of Object.entries(sessions.byId)) {
        const title = summary?.displayTitle
        if (title === undefined || title === '') continue
        putTitle(sessionId, title)
        if (next[sessionId] !== title) { next[sessionId] = title; changed = true }
      }
      return changed ? next : current
    })
  }, [sessions])
`, '')

  // 标题兜底去掉缓存层
  t = t.split(` ?? cachedTitles[card.sessionId]`).join('')
  t = t.split(`cachedTitles[sessionId] ?? `).join('')
  t = t.split(`cachedTitles[fromCard.sessionId] ?? `).join('')
  t = t.split(`cachedTitles[toCard.sessionId] ?? `).join('')
  t = t.split(`cachedTitles[hit.sessionId] ?? `).join('')
  t = t.split(`cachedTitles[otherSessionId] ?? `).join('')

  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 已撤缓存层')
}

// ---------- SidebarQueue ----------
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(`import { putTitle, readTitles } from './title-cache.ts'\n`, '')
  t = t.replace(
    `  const [cachedTitles, setCachedTitles] = useState<Record<string, string>>(readTitles)
  useEffect(() => {
    setCachedTitles(current => {
      let changed = false
      const next = { ...current }
      for (const [sessionId, summary] of Object.entries(sessions.byId)) {
        const title = summary?.displayTitle
        if (title === undefined || title === '') continue
        putTitle(sessionId, title)
        if (next[sessionId] !== title) { next[sessionId] = title; changed = true }
      }
      return changed ? next : current
    })
  }, [sessions])
`, '')
  t = t.split(` ?? cachedTitles[sessionId]`).join('')
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 已撤缓存层')
}
