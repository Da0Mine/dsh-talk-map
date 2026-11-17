import fs from 'node:fs'
const file = 'scripts/_live-sidebar-dump.mjs'
let t = fs.readFileSync(file, 'utf8')
t = t.replace(
  `console.log('初始:', JSON.stringify(probe1))`,
  `console.log('初始:', JSON.stringify(probe1))
const page1 = await page.evaluate(() => ({
  title: document.title,
  bodyLen: document.body.innerText.length,
  head: document.body.innerText.slice(0, 160).replace(/\\s+/g, ' '),
  hasBoot: typeof window.__DSH_BOOT__ !== 'undefined',
}))
console.log('页面:', JSON.stringify(page1))`,
)
fs.writeFileSync(file, t, 'utf8')
