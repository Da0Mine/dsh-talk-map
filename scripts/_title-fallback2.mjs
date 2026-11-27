import fs from 'node:fs'

// MapCanvas 最近区标题兜底用卡片快照
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `    title: sessionId => renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? t('card.loadingTitle'),`,
    `    title: sessionId => renamedTitles[sessionId]
      ?? sessions.byId[sessionId]?.displayTitle
      ?? Object.values(canvasState.cards).find(card => card.sessionId === sessionId)?.title
      ?? t('card.loadingTitle'),`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 最近区标题兜底')
}

// 外侧栏同样
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `    title: sessionId => sessions.byId[sessionId]?.displayTitle ?? sessionId,`,
    `    title: sessionId => sessions.byId[sessionId]?.displayTitle
      ?? Object.values(canvasState.cards).find(card => card.sessionId === sessionId)?.title
      ?? sessionId,`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 最近区标题兜底')
}
