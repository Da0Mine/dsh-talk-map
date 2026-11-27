import fs from 'node:fs'
const f = 'scripts/_history-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `const first = await recent()`,
  `const dbg = await page.evaluate(() => {
  const raw = localStorage.getItem('dsh.talk-map.lamp-state.v1')
  const state = window.__harness.state()
  const cards = Object.entries(state.cards ?? {}).map(([id, c]) => ({ id, session: c.sessionId, board: c.boardId }))
  return { raw: (raw ?? '').slice(0, 200), cards, sessionIds: Object.keys(state.sessions?.byId ?? {}) }
})
console.log('DBG', JSON.stringify(dbg).slice(0, 600))
const first = await recent()`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('加调试输出')
