import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

if (!t.includes('card-cache.ts')) {
  t = t.replace(/^import /m, `import { putCards, readCards } from './card-cache.ts'\nimport `)
}

// 1) 记忆化的缓存卡片 + 写回
if (!t.includes('cachedCards')) {
  t = t.replace(
    `  /** Titles known from the last run: they paint before the session list hydrates. */`,
    `  /** Card projection from the last run: paints the rail before /talk-map/state returns. */
  const cachedCards = useMemo<Record<string, Card>>(() => readCards(), [])
  useEffect(() => { putCards(canvasState.cards) }, [canvasState.cards])

  /** Titles known from the last run: they paint before the session list hydrates. */`,
  )
}

// 2) visibleCards 与缓存合并（宿主数据优先）
t = t.replace(
  `      const out: Record<string, Card> = {}
      for (const [cardId, card] of Object.entries(canvasState.cards)) {`,
  `      // Start from the last snapshot so the rail has something to draw while the Host answers;
      // real cards overwrite their cached twins below.
      const out: Record<string, Card> = { ...cachedCards }
      for (const [cardId, card] of Object.entries(canvasState.cards)) {`,
)
t = t.replace(
  `    }, [canvasState.cards, sessions, archivedSessionIds])`,
  `    }, [canvasState.cards, sessions, archivedSessionIds, cachedCards])`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('MapCanvas: 卡片缓存合并')
