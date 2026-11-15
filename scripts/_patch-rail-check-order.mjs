import fs from 'node:fs'
const file = 'scripts/_rail-current-check.mjs'
let text = fs.readFileSync(file, 'utf8')
if (!text.includes("--shot")) {
  text = text.replace(
    "console.log('errors:', JSON.stringify(errors))",
    `const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : 'test/shots/rail-current.png'
const order = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const kids = [...(panel?.children ?? [])].map(el => ({ cls: (el.className || '').split(' ').find(c => c.includes('statusRail')) ?? el.className, text: (el.innerText || '').trim().slice(0, 16) }))
  return kids
})
console.log('面板子元素顺序:', JSON.stringify(order))
if (await page.evaluate(() => document.querySelector('.tm_statusRail') === null)) {
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
  await page.waitForTimeout(700)
  const o = await page.evaluate(() => document.querySelector('.tm_statusRail')?.getAttribute('data-open'))
  if (o !== '1') { await page.click('button.tm_statusRailTab'); await page.waitForTimeout(500) }
}
await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 420, height: 700 } })
console.log('shot:', shot)
console.log('errors:', JSON.stringify(errors))`,
  )
}
fs.writeFileSync(file, text, 'utf8')
console.log('check now prints order + shot')
