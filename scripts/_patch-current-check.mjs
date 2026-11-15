import fs from 'node:fs'
const file = 'scripts/_rail-current-check.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  "await page.waitForTimeout(2600)",
  `await page.waitForTimeout(2600)
// demo 不写 dsh.sessions.current：手动标一个，模拟"从某个会话打开地图"
await page.evaluate(() => { localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 's13' })) })
await page.reload()
await page.waitForTimeout(2600)`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('check now sets the current session')
