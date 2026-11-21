import fs from 'node:fs'
const f = 'scripts/_bench-drag.mjs'
let t = fs.readFileSync(f, 'utf8')
// 用真实鼠标拖动，并核对视口 transform 真的变了（否则测的是空转）
t = t.replace(
  "// Drag the canvas with the middle button (pan) and sample frame intervals.",
  `const before = await page.evaluate(() => {
  const el = document.querySelector('.react-flow__viewport') ?? document.querySelector('[class*="viewport"]')
  return el === null ? null : getComputedStyle(el).transform
})
await page.mouse.move(800, 500)
await page.mouse.down({ button: 'middle' })
const frameSampler = page.evaluate(() => {
  window.__frames = []
  let last = performance.now()
  window.__rafOn = true
  const tick = () => {
    const now = performance.now()
    window.__frames.push(now - last)
    last = now
    if (window.__rafOn) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
await frameSampler
for (let step = 1; step <= 40; step += 1) {
  await page.mouse.move(800 + step * 6, 500 + step * 3)
  await page.waitForTimeout(16)
}
await page.mouse.up({ button: 'middle' })
const after = await page.evaluate(() => {
  window.__rafOn = false
  const el = document.querySelector('.react-flow__viewport') ?? document.querySelector('[class*="viewport"]')
  const sorted = [...window.__frames].sort((a, b) => a - b)
  return {
    transform: el === null ? null : getComputedStyle(el).transform,
    frames: window.__frames.length,
    median: Math.round(sorted[Math.floor(sorted.length / 2)] ?? 0),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    worst: Math.round(sorted[sorted.length - 1] ?? 0),
  }
})
console.log('拖动是否生效:', before !== after.transform, '| before=', before, '| after=', after.transform)
const frames = { frames: after.frames, median: after.median, p95: after.p95, worst: after.worst }`,
)
// 删掉原来那段 evaluate 采样
const startAt = t.indexOf('// Drag the canvas with the middle button (pan) and sample frame intervals.')
const endAt = t.indexOf('console.log(JSON.stringify({')
if (startAt >= 0 && endAt > startAt) {
  t = t.slice(0, startAt) + t.slice(endAt)
}
fs.writeFileSync(f, t, 'utf8')
console.log('bench: real mouse drag + transform check')
