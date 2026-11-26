import fs from 'node:fs'
const f = 'scripts/_unread-restart.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `const target = await page.evaluate(() => {
  const state = window.__harness.state()
  const card = Object.values(state.cards)[0]
  return card === undefined ? null : card.sessionId
})`,
  `const target = await page.evaluate(() => {
  const state = window.__harness.state()
  // Pick a card that is idle right now: a running session always outranks the unread mark.
  const nodes = [...document.querySelectorAll('.react-flow__node')]
  for (const node of nodes) {
    const card = state.cards[node.getAttribute('data-id')]
    if (card === undefined) continue
    const chip = node.querySelector('[data-talkmap-chip]')
    const value = chip === null ? null : chip.getAttribute('data-talkmap-chip')
    if (value === null || value === undefined) return card.sessionId
  }
  return null
})`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('测试改成挑空闲会话')
