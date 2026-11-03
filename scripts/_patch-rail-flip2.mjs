import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  `    setShift(deltas)
    const frame = requestAnimationFrame(() => { setShift({}) })
    return () => { cancelAnimationFrame(frame) }`,
  `    setShift(deltas)
    // Two frames: the offset must be painted once, then the transition carries the card
    // to its new place. Clearing in a single rAF happened before paint, so nothing moved.
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => { setShift({}) })
    })
    return () => { cancelAnimationFrame(outer); if (inner !== 0) cancelAnimationFrame(inner) }`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('double-rAF FLIP')
