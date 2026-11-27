import fs from 'node:fs'

// 1) 模型 + host schema
{
  const f = 'src/shared/model.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  wsOverride?: string
  createdAt: number`,
    `  wsOverride?: string
  /** Title snapshot: lets a restart paint the rail before the session list hydrates. */
  title?: string
  createdAt: number`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('model: Card.title')
}

{
  const f = 'src/host/routes.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  wsOverride: z.string().optional(),`,
    `  wsOverride: z.string().optional(),
  title: z.string().optional(),`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('host: cardSchema.title')
}

// 2) 创建卡片时带上标题
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `          const cards: Card[] = ordered.map((sessionId, index) => ({
            boardId: INBOX_BOARD_ID,
            sessionId,`,
    `          const cards: Card[] = ordered.map((sessionId, index) => ({
            boardId: INBOX_BOARD_ID,
            sessionId,
            ...(sessions.byId[sessionId]?.displayTitle !== undefined ? { title: sessions.byId[sessionId].displayTitle } : {}),`,
  )
  t = t.replace(
    `            added[newCardId()] = {
              boardId: INBOX_BOARD_ID,
              sessionId,`,
    `            added[newCardId()] = {
              boardId: INBOX_BOARD_ID,
              sessionId,
              ...(sessions.byId[sessionId]?.displayTitle !== undefined ? { title: sessions.byId[sessionId].displayTitle } : {}),`,
  )
  // 3) 渲染兜底：卡片自带标题
  t = t.replaceAll(
    `renamedTitles[card.sessionId] ?? summary?.displayTitle ?? t('card.loadingTitle')`,
    `renamedTitles[card.sessionId] ?? summary?.displayTitle ?? card.title ?? t('card.loadingTitle')`,
  )
  t = t.replaceAll(
    `renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? t('card.loadingTitle')`,
    `renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? card.title ?? t('card.loadingTitle')`,
  )
  t = t.replace(
    `title: sessionId => renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? t('card.loadingTitle'),`,
    `title: sessionId => renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle ?? t('card.loadingTitle'),`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 建卡带标题 + 渲染兜底')
}
