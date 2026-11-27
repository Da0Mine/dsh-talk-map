import fs from 'node:fs'
const f = 'src/client/reorder.ts'
let t = fs.readFileSync(f, 'utf8')

// 捕获时用 offsetTop（不受 transform 影响），被拖那张用视觉位置，好让它从指针处落位
t = t.replace(
  `        // Remember where every row is BEFORE the new order renders.
        pendingFlip.current = new Map(
          list.map(id => {
            const element = slots.current.get(id)
            return [id, element === undefined ? Number.NaN : element.getBoundingClientRect().top] as const
          }).filter(([, top]) => !Number.isNaN(top)),
        )`,
  `        // Remember where every row is BEFORE the new order renders. offsetTop ignores the drag
        // transforms: measuring the visual rect here folded the shift into the delta, which is
        // what showed up as the row jumping past its slot and snapping back.
        const origin = slots.current.get(drag.id)?.offsetParent as HTMLElement | null
        void origin
        pendingFlip.current = new Map(
          list.map(id => {
            const element = slots.current.get(id)
            if (element === undefined) return [id, Number.NaN] as const
            const top = id === drag.id
              ? element.getBoundingClientRect().top // where the pointer left it
              : element.offsetTop
            return [id, top] as const
          }).filter(([, top]) => !Number.isNaN(top)),
        )`,
)

// 提交后对比也用同一种口径
t = t.replace(
  `    for (const [id, top] of before) {
      const element = slots.current.get(id)
      if (element === undefined) continue
      const delta = top - element.getBoundingClientRect().top
      if (Math.abs(delta) > 1) deltas[id] = delta
    }`,
  `    for (const [id, top] of before) {
      const element = slots.current.get(id)
      if (element === undefined) continue
      // Same measure as the capture: layout position, except the released row, which settles from
      // wherever it was dropped.
      const after = id === dragEndedId.current
        ? element.getBoundingClientRect().top
        : element.offsetTop
      const delta = top - after
      if (Math.abs(delta) > 1) deltas[id] = delta
    }`,
)

t = t.replace(
  `  const pendingFlip = useRef<Map<string, number> | null>(null)`,
  `  const pendingFlip = useRef<Map<string, number> | null>(null)
  const dragEndedId = useRef<string | null>(null)`,
)
t = t.replace(
  `      if (moved) dragEndAt.current = Date.now()`,
  `      if (moved) dragEndAt.current = Date.now()
      dragEndedId.current = moved ? drag.id : null`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('reorder: FLIP 用 offsetTop 口径')
