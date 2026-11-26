import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

// CARD_MIN_H 常量
t = t.replace(
  `const PREVIEW_INTERVAL_MS = 4000`,
  `const PREVIEW_INTERVAL_MS = 4000\n/** Conservative card height for the viewport test (real heights vary with content). */\nconst CARD_MIN_H = 120`,
)

// 提前声明 cardLayoutRef（与 cameraRef 同一处）
t = t.replace(
  `  const cameraRef = useRef(camera)
  cameraRef.current = camera`,
  `  const cameraRef = useRef(camera)
  cameraRef.current = camera
  /** Slot positions, mirrored into a ref so the poll reads the latest without re-subscribing. */
  const cardLayoutRef = useRef<Record<string, { x: number; y: number }>>({})`,
)

// cardLayout 计算后同步
t = t.replace(
  `  }, [folderLayouts])

  /** card ids folded into a stack cell, and which folder each cell belongs to. */`,
  `  }, [folderLayouts])
  cardLayoutRef.current = cardLayout

  /** card ids folded into a stack cell, and which folder each cell belongs to. */`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('补齐 CARD_MIN_H 与 cardLayoutRef')
