import fs from 'node:fs'

// ---------- CSS ----------
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  // 1) 给光晕留出上下左右空间（原来左右 0、上 2px，40px 的 halo 会被滚动容器裁掉）
  t = t.replace(
    `  gap: 10px;
  padding: 2px 0 14px;`,
    `  gap: 10px;
  /* Room for the lamp halo: an overflow:auto box clips on both axes, and the glow spreads
     40px, so the list keeps real padding instead of 2px/0. */
  padding: 16px 18px 18px;`,
  )
  // 2) 面板宽度里同步留出这段空间（26 -> 38，正好等于左右各 18px + 2px 边框）
  t = t.replace(
    `  --rail-w: calc(var(--rail-card-outer) + var(--rail-pad) * 2 + 26px);`,
    `  --rail-w: calc(var(--rail-card-outer) + var(--rail-pad) * 2 + 38px);`,
  )
  // 3) 展开时把手可横向拖拽
  if (!t.includes('cursor: ew-resize')) {
    t += `
/* Open, the handle doubles as the resize grip. */
.statusRail[data-open="1"] .statusRailTab {
  cursor: ew-resize;
}
`
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 光晕留白 + 把手可拖拽光标')
}

// ---------- TSX ----------
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')

  // 宽度存取
  t = t.replace(
    `const ORDER_KEY = 'dsh.talk-map.status-rail.order.v1'`,
    `const ORDER_KEY = 'dsh.talk-map.status-rail.order.v1'
const WIDTH_KEY = 'dsh.talk-map.status-rail.width.v1'
/** Resize bounds in px: never narrower than the default open width, never wider than this. */
const RAIL_MAX_W = 560`,
  )

  t = t.replace(
    `function subscribeOpen(listener: () => void): () => void {`,
    `function readRailWidth(): number | null {
  try {
    const raw = window.localStorage.getItem(WIDTH_KEY)
    if (raw === null) return null
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function writeRailWidth(width: number): void {
  try {
    window.localStorage.setItem(WIDTH_KEY, String(Math.round(width)))
  } catch {
    /* a blocked store must not break the map */
  }
}

function subscribeOpen(listener: () => void): () => void {`,
  )

  // 组件内：宽度状态 + 拖拽
  t = t.replace(
    `  const [order, setOrder] = useState<string[]>(() => readOrder())`,
    `  const [railWidth, setRailWidth] = useState<number | null>(() => readRailWidth())
  /** The default open width: the floor for resizing, derived from the card width. */
  const minRailWidth = props.cardWidth + 26 + 20 + 38
  const resizeRef = useRef<{ x: number; w: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  const startResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!open || event.button !== 0) return
    const panel = panelRef.current
    const current = railWidth ?? (panel === null ? minRailWidth : Math.round(panel.getBoundingClientRect().width))
    resizeRef.current = { x: event.clientX, w: current, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [open, railWidth, minRailWidth])

  const moveResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const state = resizeRef.current
    if (state === null) return
    const delta = event.clientX - state.x
    if (!state.moved) {
      if (Math.abs(delta) < 3) return
      state.moved = true
    }
    setRailWidth(Math.max(minRailWidth, Math.min(RAIL_MAX_W, Math.round(state.w + delta))))
  }, [minRailWidth])

  const endResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const state = resizeRef.current
    resizeRef.current = null
    if (state !== null && state.moved) {
      suppressClickRef.current = true
      event.preventDefault()
    }
  }, [])

  useEffect(() => {
    if (railWidth !== null) writeRailWidth(railWidth)
  }, [railWidth])

  const [order, setOrder] = useState<string[]>(() => readOrder())`,
  )

  // toggle 要放过拖拽结束产生的那次 click
  t = t.replace(
    `  const toggle = useCallback(() => {
    setOpenState(!openSnapshot())
  }, [])`,
    `  const toggle = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setOpenState(!openSnapshot())
  }, [])`,
  )

  // 样式变量：拖宽后卡片跟着变宽
  t = t.replace(
    `      style={{ ['--rail-card-w' as string]: \`\${props.cardWidth}px\` }}`,
    `      style={railWidth === null
        ? { ['--rail-card-w' as string]: \`\${props.cardWidth}px\` }
        : {
            ['--rail-card-w' as string]: \`\${Math.max(160, railWidth - 84)}px\`,
            ['--rail-w' as string]: \`\${railWidth}px\`,
          }}`,
  )

  // 把手挂上拖拽处理
  t = t.replace(
    `        onClick={toggle}
      >`,
    `        onClick={toggle}
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
      >`,
  )

  fs.writeFileSync(f, t, 'utf8')
  console.log('TSX: 可拖拽调宽 + 记忆宽度')
}
