import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = t

// 把所有剩余的"标题兜底成 sessionId"改成 顺序：重命名 → 会话 → 卡片快照 → 本地缓存 → 加载中
const pairs = [
  [`title: renamedTitles[hit.sessionId] ?? sessions.byId[hit.sessionId]?.displayTitle ?? hit.sessionId,`,
   `title: renamedTitles[hit.sessionId] ?? sessions.byId[hit.sessionId]?.displayTitle ?? canvasState.cards[hit.cardId]?.title ?? cachedTitles[hit.sessionId] ?? t('card.loadingTitle'),`],
  [`title: renamedTitles[card.sessionId] ?? sessions.byId[card.sessionId]?.displayTitle ?? card.sessionId,`,
   `title: renamedTitles[card.sessionId] ?? sessions.byId[card.sessionId]?.displayTitle ?? card.title ?? cachedTitles[card.sessionId] ?? t('card.loadingTitle'),`],
  [`title: renamedTitles[otherSessionId] ?? sessions.byId[otherSessionId]?.displayTitle ?? otherSessionId,`,
   `title: renamedTitles[otherSessionId] ?? sessions.byId[otherSessionId]?.displayTitle ?? cachedTitles[otherSessionId] ?? t('card.loadingTitle'),`],
  [`fromTitle = sessions.byId[fromCard.sessionId]?.displayTitle ?? fromCard.sessionId`,
   `fromTitle = sessions.byId[fromCard.sessionId]?.displayTitle ?? fromCard.title ?? cachedTitles[fromCard.sessionId] ?? t('card.loadingTitle')`],
  [`toTitle = sessions.byId[toCard.sessionId]?.displayTitle ?? toCard.sessionId`,
   `toTitle = sessions.byId[toCard.sessionId]?.displayTitle ?? toCard.title ?? cachedTitles[toCard.sessionId] ?? t('card.loadingTitle')`],
]
let hits = 0
for (const [from, to] of pairs) {
  const count = t.split(from).length - 1
  if (count > 0) { t = t.split(from).join(to); hits += count }
}
fs.writeFileSync(f, t, 'utf8')
console.log('替换了', hits, '处标题兜底；文件是否变化 =', before !== t)
