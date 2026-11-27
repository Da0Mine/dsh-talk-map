import fs from 'node:fs'
const f = 'src/client/reorder.ts'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `        if (Object.keys(deltas).length === 0) return`,
  `        // A residual of a few pixels is the difference between the uniform "step" used while
        // dragging and the real per-row height: animating it is what the user saw as a twitch.
        // Only the rows that really have to travel (the released one, and cross-bucket slides)
        // get the animation; the rest are simply already in place.
        for (const [id, delta] of Object.entries(deltas)) {
          if (Math.abs(delta) <= FLIP_MIN_DELTA) delete deltas[id]
        }
        if (Object.keys(deltas).length === 0) return`,
)
t = t.replace(
  `const CLICK_GUARD_MS = 350`,
  `const CLICK_GUARD_MS = 350
/** Below this, a correction is snapped instead of animated (see the FLIP block). */
const FLIP_MIN_DELTA = 24`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('reorder: FLIP 小位移直接吸附')
