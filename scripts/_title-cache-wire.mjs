import fs from 'node:fs'

// MapCanvas：标题缓存播种 + 兜底 + 回写
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('title-cache.ts')) {
    t = t.replace(/^import /m, `import { putTitle, readTitles } from './title-cache.ts'\nimport `)
  }
  if (!t.includes('cachedTitles')) {
    t = t.replace(
      `  const [renamedTitles, setRenamedTitles] = useState<Record<string, string>>({})`,
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
  const [renamedTitles, setRenamedTitles] = useState<Record<string, string>>({})`,
    )
  }
  // 渲染兜底：缓存优先于"加载中"
  t = t.replaceAll(
    `renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? t('card.loadingTitle')`,
    `renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? cachedTitles[sessionId] ?? t('card.loadingTitle')`,
  )
  t = t.replaceAll(
    `renamedTitles[card.sessionId] ?? summary?.displayTitle ?? card.title ?? t('card.loadingTitle')`,
    `renamedTitles[card.sessionId] ?? summary?.displayTitle ?? card.title ?? cachedTitles[card.sessionId] ?? t('card.loadingTitle')`,
  )
  t = t.replaceAll(
    `renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? card.title ?? t('card.loadingTitle')`,
    `renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? card.title ?? cachedTitles[card.sessionId] ?? t('card.loadingTitle')`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 标题缓存')
}

// SidebarQueue：同样播种
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('title-cache.ts')) {
    t = t.replace(/^import /m, `import { putTitle, readTitles } from './title-cache.ts'\nimport `)
  }
  if (!t.includes('cachedTitles')) {
    t = t.replace(
      `  const [previews, setPreviews] = useState<Record<string, string>>(readPreviewTexts)`,
      `  const [previews, setPreviews] = useState<Record<string, string>>(readPreviewTexts)
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
  }, [sessions])`,
    )
  }
  t = t.replace(
    `    title: sessionId => sessions.byId[sessionId]?.displayTitle
      ?? Object.values(canvasState.cards).find(card => card.sessionId === sessionId)?.title
      ?? sessionId,`,
    `    title: sessionId => sessions.byId[sessionId]?.displayTitle
      ?? Object.values(canvasState.cards).find(card => card.sessionId === sessionId)?.title
      ?? cachedTitles[sessionId]
      ?? sessionId,`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 标题缓存')
}
