import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

// 会话列表还没 hydrate 时，不能把卡片判成 ghost
t = t.replace(
  `        const data: SessionCardData = {
          cardId,
          sessionId: card.sessionId,`,
  `        // A card is only a ghost once the session list has actually loaded and the session is
        // missing. Treating "list not here yet" as ghost is what kept the title away: the card
        // rendered 「会话已不存在」 instead of the cached title until hydration finished.
        const sessionsReady = sessions.ids.length > 0
        const data: SessionCardData = {
          cardId,
          sessionId: card.sessionId,`,
)
t = t.replace(`          ghost: summary === undefined,`, `          ghost: sessionsReady && summary === undefined,`)
fs.writeFileSync(f, t, 'utf8')
console.log('MapCanvas: ghost 判定加入"列表是否就绪"')
