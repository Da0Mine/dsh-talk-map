import fs from 'node:fs'
const f = 'src/client/reorder.ts'
let t = fs.readFileSync(f, 'utf8')

// 1) flip 状态与接口
t = t.replace(
  `  /** How far a given row should slide to open a gap. */
  shiftOf: (id: string) => number`,
  `  /** How far a given row should slide to open a gap. */
  shiftOf: (id: string) => number
  /** Post-commit correction (FLIP) so a released row settles instead of jumping. */
  flipOf: (id: string) => number
  /** True while a FLIP correction is on screen: the row must not animate toward it. */
  flipping: boolean`,
)

t = t.replace(
  `  const [offsetY, setOffsetY] = useState(0)
  const dragEndAt = useRef(0)`,
  `  const [offsetY, setOffsetY] = useState(0)
  const [flip, setFlip] = useState<Record<string, number>>({})
  const pendingFlip = useRef<Map<string, number> | null>(null)
  const dragEndAt = useRef(0)`,
)

t = t.replace(
  `  const shouldIgnoreClick = useCallback(() => Date.now() - dragEndAt.current < CLICK_GUARD_MS, [])`,
  `  const shouldIgnoreClick = useCallback(() => Date.now() - dragEndAt.current < CLICK_GUARD_MS, [])

  const flipOf = useCallback((id: string): number => flip[id] ?? 0, [flip])

  // FLIP: after the new order is in the DOM, put every moved row back where it was, then let it
  // transition to its real position. Without this the rows that slide for the drop and the rows
  // that move because of the new order do both at once — the jitter the user sees.
  useEffect(() => {
    const before = pendingFlip.current
    if (before === null) return
    pendingFlip.current = null
    const deltas: Record<string, number> = {}
    for (const [id, top] of before) {
      const element = slots.current.get(id)
      if (element === undefined) continue
      const delta = top - element.getBoundingClientRect().top
      if (Math.abs(delta) > 1) deltas[id] = delta
    }
    if (Object.keys(deltas).length === 0) return
    setFlip(deltas)
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => { setFlip({}) })
    })
    return () => {
      cancelAnimationFrame(outer)
      if (inner !== 0) cancelAnimationFrame(inner)
    }
  }, [ids])`,
)

t = t.replace(
  `      const list = idsRef.current
      const from = list.indexOf(drag.id)
      const moved = Math.abs(offsetY) > 3 || (hover >= 0 && hover !== from)
      if (from >= 0 && hover >= 0 && hover !== from) {`,
  `      const list = idsRef.current
      const from = list.indexOf(drag.id)
      const moved = Math.abs(offsetY) > 3 || (hover >= 0 && hover !== from)
      if (from >= 0 && hover >= 0 && hover !== from) {
        // Remember where every row is BEFORE the new order renders.
        pendingFlip.current = new Map(
          list.map(id => {
            const element = slots.current.get(id)
            return [id, element === undefined ? Number.NaN : element.getBoundingClientRect().top] as const
          }).filter(([, top]) => !Number.isNaN(top)),
        )`,
)

t = t.replace(
  `  return { draggingId: drag?.id, offsetY, shiftOf, shouldIgnoreClick, begin, register }`,
  `  return { draggingId: drag?.id, offsetY, shiftOf, flipOf, flipping: Object.keys(flip).length > 0, shouldIgnoreClick, begin, register }`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('reorder: 加 FLIP')
