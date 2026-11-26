import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 批量与节奏：8 → 4，1.5s → 4s
t = t.replace('const PREVIEW_BATCH = 8', 'const PREVIEW_BATCH = 4\n/** How often the preview poll runs. Bodies are cosmetic; the Host read behind each one can\n *  decompress a 37 MB session log (≈116 MB, ≈180 ms), so this stays deliberately slow. */\nconst PREVIEW_INTERVAL_MS = 4000')

// 2) 引入 useViewport
t = t.replace(
  `} from '@xyflow/react'`,
  `  useViewport,\n} from '@xyflow/react'`,
)

// 3) 在组件里保存视口，供轮询过滤
t = t.replace(
  '  const wrapperRef = useRef<HTMLDivElement | null>(null)',
  `  const wrapperRef = useRef<HTMLDivElement | null>(null)
  /** Live camera, read by the preview poll so off-screen cards never trigger a Host read. */
  const camera = useViewport()
  const cameraRef = useRef(camera)
  cameraRef.current = camera`,
)

// 4) 轮询里按视口过滤
t = t.replace(
  `      const { cards, sessions: latest } = previewInputs.current
      const pending: string[] = []
      const stamps: [string, number][] = []
      for (const card of Object.values(cards)) {
        const stamp = latest.byId[card.sessionId]?.updatedAt ?? 0
        if (previewStamp.current.get(card.sessionId) === stamp) continue
        pending.push(card.sessionId)
        stamps.push([card.sessionId, stamp])
      }`,
  `      const { cards, sessions: latest } = previewInputs.current
      const pending: string[] = []
      const stamps: [string, number][] = []
      // Only cards inside the viewport are worth a Host read: a body nobody can see is a
      // decompressed 100 MB log for nothing. A board with a thousand cards used to keep the
      // poll busy for minutes after every session tick.
      const box = wrapperRef.current?.getBoundingClientRect()
      const view = cameraRef.current
      let left = -1e9
      let top = -1e9
      let right = 1e9
      let bottom = 1e9
      if (box !== undefined && box.width > 0) {
        const margin = 240
        left = (-view.x) / view.zoom - margin
        top = (-view.y) / view.zoom - margin
        right = (box.width - view.x) / view.zoom + margin
        bottom = (box.height - view.y) / view.zoom + margin
      }
      const layout = cardLayoutRef.current
      for (const [cardId, card] of Object.entries(cards)) {
        const slot = layout[cardId] ?? card
        if (slot.x + CARD_W < left || slot.x > right) continue
        if (slot.y + CARD_MIN_H < top || slot.y > bottom) continue
        const stamp = latest.byId[card.sessionId]?.updatedAt ?? 0
        if (previewStamp.current.get(card.sessionId) === stamp) continue
        pending.push(card.sessionId)
        stamps.push([card.sessionId, stamp])
      }`,
)

// 5) 用新节奏
t = t.replace('const timer = setInterval(tick, 1500)', 'const timer = setInterval(tick, PREVIEW_INTERVAL_MS)')

fs.writeFileSync(f, t, 'utf8')
console.log('MapCanvas: 预览轮询加视口过滤 + 8/1.5s → 4/4s')
