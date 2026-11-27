import fs from 'node:fs'

{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(`label: sessions.byId[sessionId]?.displayTitle ?? sessionId,`,
    `label: sessions.byId[sessionId]?.displayTitle ?? cachedTitles[sessionId] ?? t('card.loadingTitle'),`)
  t = t.replace(`? sessions.byId[fromCard.sessionId]?.displayTitle ?? fromCard.sessionId`,
    `? sessions.byId[fromCard.sessionId]?.displayTitle ?? fromCard.title ?? cachedTitles[fromCard.sessionId] ?? t('card.loadingTitle')`)
  t = t.replace(`? sessions.byId[toCard.sessionId]?.displayTitle ?? toCard.sessionId`,
    `? sessions.byId[toCard.sessionId]?.displayTitle ?? toCard.title ?? cachedTitles[toCard.sessionId] ?? t('card.loadingTitle')`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 剩余兜底已改')
}

{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const before = `        title: summary.displayTitle ?? sessionId,`
  if (t.includes(before)) {
    t = t.replace(before, `        title: summary.displayTitle ?? cachedTitles[sessionId] ?? sessionId,`)
    fs.writeFileSync(f, t, 'utf8')
    console.log('SidebarQueue: 队列行标题兜底')
  }
}
