import fs from 'node:fs'
const f = 'src/client/reorder.ts'
let t = fs.readFileSync(f, 'utf8')

// 1) 记录按下时每个槽位的位置
t = t.replace(
  `  /** Row centres captured at the press. */
  centres: number[]`,
  `  /** Row centres captured at the press. */
  centres: number[]
  /** Viewport top of every slot at the press: the exact geometry a drop has to reproduce. */
  slots: number[]`,
)
t = t.replace(
  `    setDrag({ id, index, startY: event.clientY, step: height + gap, centres })`,
  `    const slots = list.map(rowId => {
      const row = slots.current.get(rowId)
      return row === undefined ? Number.NaN : row.getBoundingClientRect().top
    })
    setDrag({ id, index, startY: event.clientY, step: height + gap, centres, slots })`,
)

// 2) 让位距离 = 槽位差（而不是统一的 step），高度不一致也不会残留
t = t.replace(
  `  const shiftOf = useCallback((id: string): number => {
    if (drag === null || id === drag.id || hover < 0) return 0
    const index = idsRef.current.indexOf(id)
    if (index < 0) return 0
    if (hover > drag.index && index > drag.index && index <= hover) return -drag.step
    if (hover < drag.index && index >= hover && index < drag.index) return drag.step
    return 0
  }, [drag, hover])`,
  `  const shiftOf = useCallback((id: string): number => {
    if (drag === null || id === drag.id || hover < 0) return 0
    const list = idsRef.current
    const from = list.indexOf(id)
    if (from < 0 || hover === drag.index) return 0
    // Where this row would sit after the drop, and how far that slot is from its current one.
    // Using the captured slot tops (instead of a uniform row height) is what makes rows of
    // different heights land exactly, with no residual left to animate on release.
    const next = [...list]
    next.splice(drag.index, 1)
    next.splice(hover, 0, drag.id)
    const to = next.indexOf(id)
    if (to < 0 || to === from) return 0
    const fromTop = drag.slots[from]
    const toTop = drag.slots[to]
    if (fromTop === undefined || toTop === undefined) return 0
    if (Number.isNaN(fromTop) || Number.isNaN(toTop)) return 0
    return toTop - fromTop
  }, [drag, hover])`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('reorder: 让位按真实槽位计算')
