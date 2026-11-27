import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

// 更保守的预热：会话列表就绪后再等 4 秒，单张、间隔 1.2 秒
t = t.replace(
  `const PREVIEW_WARM_BATCH = 3
const PREVIEW_WARM_GAP_MS = 400`,
  `const PREVIEW_WARM_BATCH = 1
const PREVIEW_WARM_GAP_MS = 1200
/** Give the shell time to finish hydrating titles before any surface read happens. */
const PREVIEW_WARM_DELAY_MS = 4000`,
)
t = t.replace(
  `const PREVIEW_WARM_GAP_MIN = 400
const PREVIEW_WARM_GAP_MAX = 4000`,
  `const PREVIEW_WARM_GAP_MIN = 1200
const PREVIEW_WARM_GAP_MAX = 6000`,
)
t = t.replace(
  `    let cancelled = false
    let gap = PREVIEW_WARM_GAP_MS
    const step = (): void => {`,
  `    let cancelled = false
    let gap = PREVIEW_WARM_GAP_MS
    let started = false
    const step = (): void => {
      if (!started) {
        started = true
        // First call is delayed: reading surfaces at t=0 is what delayed the session list.
        setTimeout(() => { if (!cancelled) step() }, PREVIEW_WARM_DELAY_MS)
        return
      }`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('MapCanvas: 预热延迟 4s, 单张 1.2s')
