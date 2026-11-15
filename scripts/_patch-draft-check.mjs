import fs from 'node:fs'
const file = 'scripts/_draft-preview-check2.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  `await page.evaluate(() => {
  const key = 'dsh.conversation.s13'
  const raw = localStorage.getItem(key)
  const parsed = raw ? JSON.parse(raw) : {}
  parsed.draft = '这是待发送的内容，不该被旧消息覆盖'
  localStorage.setItem(key, JSON.stringify(parsed))
})
await page.waitForTimeout(2500)`,
  `// 选一张真实渲染在画布上的卡片
const target = await page.evaluate(() => {
  const card = document.querySelector('[data-talkmap-session]')
  const sid = card?.getAttribute('data-talkmap-session') ?? null
  const before = card?.querySelector('[class*="cardSummary"]')?.textContent ?? null
  if (sid !== null) {
    const key = 'dsh.conversation.' + sid
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed.draft = '这是待发送的内容，不该被旧消息覆盖'
    localStorage.setItem(key, JSON.stringify(parsed))
  }
  return { sid, before }
})
await page.waitForTimeout(2500)
console.log('目标会话:', JSON.stringify(target))`,
)
text = text.replace(
  `  const card = document.querySelector('[data-talkmap-session="s13"]')
  const stored = localStorage.getItem('dsh.conversation.s13')`,
  `  const card = document.querySelector('[data-talkmap-session]')
  const stored = localStorage.getItem('dsh.conversation.' + (card?.getAttribute('data-talkmap-session') ?? ''))`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('check now targets a rendered card')
