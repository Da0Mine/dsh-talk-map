import fs from 'node:fs'
const file = 'scripts/_rail-current-check.mjs'
let text = fs.readFileSync(file, 'utf8')
const orderBlock = `const order = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const kids = [...(panel?.children ?? [])].map(el => ({ cls: (el.className || '').split(' ').find(c => c.includes('statusRail')) ?? el.className, text: (el.innerText || '').trim().slice(0, 16) }))
  return kids
})
console.log('面板子元素顺序:', JSON.stringify(order))
`
text = text.replace(orderBlock, '')
text = text.replace(
  `const shot = process.argv.includes('--shot')`,
  `// 重新打开地图 + 侧栏，再读顺序与截图
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(800)
if (await page.evaluate(() => document.querySelector('.tm_statusRail')?.getAttribute('data-open')) !== '1') {
  await page.click('button.tm_statusRailTab')
  await page.waitForTimeout(600)
}
const order = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  return [...(panel?.children ?? [])].map(el => ({
    cls: (el.className || '').split(' ').filter(c => c.includes('statusRail')).join('.'),
    text: (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 24),
  }))
})
console.log('面板子元素顺序:', JSON.stringify(order, null, 1))
const shot = process.argv.includes('--shot')`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('order read after reopening')
