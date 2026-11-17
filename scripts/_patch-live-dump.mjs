import fs from 'node:fs'
const file = 'scripts/_live-sidebar-dump.mjs'
let t = fs.readFileSync(file, 'utf8')
t = t.replace(
  `const dump = await page.evaluate(() => {
  const root = document.querySelector('[data-talkmap-queue-root]')`,
  `// 侧栏默认是窄条(wide=false)，先展开它
const probe1 = await page.evaluate(() => ({
  hasBack: document.querySelector('[data-talkmap-back]') !== null,
  hasQueueRoot: document.querySelector('[data-talkmap-queue-root]') !== null,
  footerBar: document.querySelectorAll('[class*="footerBar"]').length,
  footerAction: document.querySelectorAll('[class*="footerAction"]').length,
  sidebarCandidates: [...document.querySelectorAll('[class*="sidebar" i]')].slice(0, 6).map(el => el.className.toString().slice(0, 60)),
}))
console.log('初始:', JSON.stringify(probe1))
if (probe1.hasBack === true && probe1.hasQueueRoot === false) {
  // 展开侧栏：点左上角的侧栏开关
  await page.keyboard.press('Control+b').catch(() => {})
  await page.waitForTimeout(1200)
}
const dump = await page.evaluate(() => {
  const root = document.querySelector('[data-talkmap-queue-root]')`)
fs.writeFileSync(file, t, 'utf8')
console.log('probe updated')
