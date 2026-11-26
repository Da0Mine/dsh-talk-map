import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793
const CDP = 10080
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'audit-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const cdp = await page.context().newCDPSession(page)
await cdp.send('Performance.enable')
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
const seed = (count) => page.evaluate((n) => {
  const key = 'dsh-talk-map.demo-state.v1'
  const saved = JSON.parse(localStorage.getItem(key) ?? 'null') ?? { cards: {}, edges: {}, digests: {}, global: {} }
  const cards = {}
  for (let i = 0; i < n; i += 1) {
    const id = 'audit-' + i
    cards[id] = { boardId: 'inbox', sessionId: 's' + (i % 8 + 1), x: (i % 20) * 280, y: Math.floor(i / 20) * 200, createdAt: Date.now() - i * 1000 }
  }
  saved.cards = cards
  localStorage.setItem(key, JSON.stringify(saved))
}, count)
const rows = []
for (const count of [0, 200, 800]) {
  await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
  await page.waitForTimeout(800)
  await seed(count)
  await page.reload()
  await page.waitForSelector('.react-flow__node', { timeout: 12000 }).catch(() => null)
  await page.waitForTimeout(2000)
  // 地图关闭态
  const a = await metrics()
  await page.waitForTimeout(10000)
  const b = await metrics()
  // 打开地图
  await page.evaluate(() => { const btn = document.querySelector('[class*="tm_sidebarEntry"]'); if (btn !== null) btn.click() })
  await page.waitForTimeout(2500)
  const c = await metrics()
  await page.waitForTimeout(10000)
  const d = await metrics()
  const cards = await page.evaluate(() => document.querySelectorAll('[data-talkmap-session]').length)
  rows.push({
    cards: count,
    renderedCards: cards,
    closedIdleCpuPct: +( ((b.TaskDuration - a.TaskDuration) / 10) * 100).toFixed(1),
    openIdleCpuPct: +( ((d.TaskDuration - c.TaskDuration) / 10) * 100).toFixed(1),
    heapClosedMB: +(b.JSHeapUsedSize / 1048576).toFixed(1),
    heapOpenMB: +(d.JSHeapUsedSize / 1048576).toFixed(1),
    nodes: b.Nodes, listeners: b.JSEventListeners,
  })
}
console.log(JSON.stringify(rows, null, 1))
await page.close(); await browser.close(); child.kill()
