import fs from 'node:fs'
const file = 'scripts/_sidebar-queue-check.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  `// 模拟侧栏展开（wide=true）
const before = await page.evaluate(() => document.querySelectorAll('[class*="sidebarQueueItem"]').length)
await page.evaluate(() => { const h = window.__harness; if (h?.sidebarState) h.layout?.toggleSidebar?.({ collapsed: false }) })
await page.waitForTimeout(800)`,
  `// demo 启动时地图是打开的（侧栏被收成 rail）；关掉地图侧栏才会展开成 wide
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(900)
const before = await page.evaluate(() => ({
  collapsed: window.__harness.sidebarState().collapsed,
  items: document.querySelectorAll('[class*="sidebarQueueItem"]').length,
}))`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('check closes the map first')
