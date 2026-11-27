import fs from 'node:fs'

// i18n：加载中占位
{
  const f = 'src/client/i18n.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("'card.loadingTitle'")) {
    t = t.replace(/(\s*)'card\.ghostTitle': '会话已不存在',/, `$1'card.ghostTitle': '会话已不存在',$1'card.loadingTitle': '会话加载中…',`)
    t = t.replace(/(\s*)'card\.ghostTitle': 'Session no longer exists',/, `$1'card.ghostTitle': 'Session no longer exists',$1'card.loadingTitle': 'Loading session…',`)
    fs.writeFileSync(f, t, 'utf8')
    console.log('i18n: card.loadingTitle')
  }
}

// MapCanvas：标题兜底不再用 sessionId（看起来像乱码）
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replaceAll(
    `renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? card.sessionId`,
    `renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? t('card.loadingTitle')`,
  )
  t = t.replaceAll(
    `renamedTitles[card.sessionId] ?? summary?.displayTitle ?? card.sessionId`,
    `renamedTitles[card.sessionId] ?? summary?.displayTitle ?? t('card.loadingTitle')`,
  )
  t = t.replace(
    `title: sessionId => renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? sessionId,`,
    `title: sessionId => renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? t('card.loadingTitle'),`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 标题占位')
}
