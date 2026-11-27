import fs from 'node:fs'
const f = 'src/client/reorder.ts'
let t = fs.readFileSync(f, 'utf8')

// 松手瞬间就关掉过渡；deltas 在下一帧再算
t = t.replace(
  `      if (moved) dragEndAt.current = Date.now()
      setDrag(null)
      setHover(-1)
      setOffsetY(0)

      if (before.size === 0) return`,
  `      if (moved) dragEndAt.current = Date.now()
      // Freeze transitions on the very frame the rows are released: their layout slot changes by
      // the same amount the shift transform is dropped, and animating that looks like a twitch.
      setFlipPhase(0)
      setDrag(null)
      setHover(-1)
      setOffsetY(0)

      if (before.size === 0) {
        requestAnimationFrame(() => { setFlipPhase(2) })
        return
      }`,
)
t = t.replace(
  `        if (Object.keys(deltas).length === 0) return
        setFlip(deltas)
        setFlipPhase(0)
        requestAnimationFrame(() => {`,
  `        setFlip(deltas)
        if (Object.keys(deltas).length === 0) {
          // Nothing has to travel: just hand the transitions back next frame.
          requestAnimationFrame(() => { setFlipPhase(2) })
          return
        }
        requestAnimationFrame(() => {`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('reorder: 松手首帧统一关过渡')
