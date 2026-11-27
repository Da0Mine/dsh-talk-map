import fs from 'node:fs'
const f = 'scripts/_history-check.mjs'
let t = fs.readFileSync(f, 'utf8')
// 用 addInitScript 在应用启动前播种
t = t.replace(
  `await page.goto(\`http://127.0.0.1:\${PORT}/test/index.html?run=seed\`)
// 播种 lamp-state：finished 为空、history 有 3 条（模拟"上次已完成并看过"）
await page.evaluate(() => {
  const now = Date.now()
  localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history: { s3: now - 3000, s5: now - 2000, s7: now - 1000 } }))
  localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
})`,
  `await page.addInitScript(() => {
  const now = Date.now()
  try {
    localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history: { s3: now - 3000, s5: now - 2000, s7: now - 1000 } }))
    localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
  } catch {}
})`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('改用 addInitScript 播种')
