import fs from 'node:fs'
const f = 'scripts/_lamp-lifecycle.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `const target = await page.evaluate(() => {
  const state = window.__harness.state()
  const ids = [...new Set(Object.values(state.cards).map(c => c.sessionId))]
  return ids.find(id => id !== 's1') ?? ids[0]
})`,
  `const target = await page.evaluate(() => {
  const state = window.__harness.state()
  const ids = [...new Set(Object.values(state.cards).map(c => c.sessionId))]
  for (const id of ids) {
    const card = document.querySelector(\`[data-talkmap-session="\${id}"]\`)
    const chip = card === null ? null : card.querySelector('[data-talkmap-chip]')
    if (chip === null) return id
  }
  return ids[0]
})`,
)
fs.writeFileSync(f, 'utf8')
console.log('改成挑一个当前无灯的会话')
