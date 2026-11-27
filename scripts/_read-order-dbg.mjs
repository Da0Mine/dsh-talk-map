import fs from 'node:fs'
const f = 'scripts/_read-order-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  const list = await page.evaluate(() => {`,
  `  const dbg = await page.evaluate(() => {
    const state = window.__harness.state()
    return { cards: Object.entries(state.cards ?? {}).map(([id, c]) => id + '=' + c.sessionId) }
  })
  console.log('板上的卡:', JSON.stringify(dbg.cards))
  const list = await page.evaluate(() => {`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('加板上卡清单')
