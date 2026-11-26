import fs from 'node:fs'
const f = 'scripts/_recent-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(1200)`,
  `await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(1200)
// 清掉几张卡的灯，制造"没有状态"的卡片
await page.evaluate(() => {
  for (const id of ['s3', 's15', 's2']) {
    try { window.__harness.hostNotUnread(id) } catch { /* ignore */ }
    try { window.__harness.setRunning(id, false) } catch { /* ignore */ }
  }
})
await page.waitForTimeout(1800)`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('测试：先清掉 3 个会话的灯')
