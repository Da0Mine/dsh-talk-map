import fs from 'node:fs'
const f = 'src/client/reorder.ts'
let t = fs.readFileSync(f, 'utf8')

// 三帧 FLIP：0=无过渡地放到旧位；1=打开过渡（仍在旧位）；2=清掉位移 → 平滑归位
t = t.replace(
  `  const [flip, setFlip] = useState<Record<string, number>>({})`,
  `  const [flip, setFlip] = useState<Record<string, number>>({})
  /** 0 = sitting at the old position without transition, 1 = transition armed, 2 = released. */
  const [flipPhase, setFlipPhase] = useState<0 | 1 | 2>(2)`,
)
t = t.replace(
  `  flipOf: (id: string) => number
  /** True while a FLIP correction is on screen: the row must not animate toward it. */
  flipping: boolean`,
  `  flipOf: (id: string) => number
  /** True while the row must move without a transition (the first FLIP frame). */
  flipping: boolean`,
)
t = t.replace(
  `    if (Object.keys(deltas).length === 0) return
    setFlip(deltas)
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => { setFlip({}) })
    })
    return () => {
      cancelAnimationFrame(outer)
      if (inner !== 0) cancelAnimationFrame(inner)
    }`,
  `    if (Object.keys(deltas).length === 0) return
    setFlip(deltas)
    setFlipPhase(0)
    let inner = 0
    let last = 0
    const outer = requestAnimationFrame(() => {
      // Arm the transition while the row is still parked at the old position, otherwise the
      // change to zero happens in the same style resolution and the browser skips the animation.
      setFlipPhase(1)
      inner = requestAnimationFrame(() => {
        last = requestAnimationFrame(() => {
          setFlip({})
          setFlipPhase(2)
        })
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      if (inner !== 0) cancelAnimationFrame(inner)
      if (last !== 0) cancelAnimationFrame(last)
    }`,
)
t = t.replace(
  `  return { draggingId: drag?.id, offsetY, shiftOf, flipOf, flipping: Object.keys(flip).length > 0, shouldIgnoreClick, begin, register }`,
  `  return {
    draggingId: drag?.id,
    offsetY,
    shiftOf,
    flipOf,
    flipping: flipPhase === 0,
    shouldIgnoreClick,
    begin,
    register,
  }`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('reorder: 三帧 FLIP')
