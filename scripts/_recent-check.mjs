import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10090
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'recent-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2400)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(1200)
// 清掉几张卡的灯，制造"没有状态"的卡片
await page.evaluate(() => {
  for (const id of ['s3', 's15', 's2']) {
    try { window.__harness.hostNotUnread(id) } catch { /* ignore */ }
    try { window.__harness.setRunning(id, false) } catch { /* ignore */ }
  }
})
await page.waitForTimeout(1800)
// 清掉几张卡的灯，制造"没有状态"的卡片
await page.evaluate(() => {
  for (const id of ['s3', 's15', 's2']) {
    try { window.__harness.hostNotUnread(id) } catch { /* ignore */ }
    try { window.__harness.setRunning(id, false) } catch { /* ignore */ }
  }
})
await page.waitForTimeout(1800)
const info = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  const rail = document.querySelector('[class*="statusRailPanel"]')
  const list = rail?.querySelector('[class*="statusRailList"]')
  const recentCards = head === null ? [] : [...list.querySelectorAll('[class*="statusRailSlot"]')].slice([...list.children].indexOf(head) + 1).map(n => n.textContent?.slice(0, 18))
  const reticles = document.querySelectorAll('[class*="cardReticle"]').length
  return { hasHead: head !== null, headText: head?.textContent ?? null, recentCount: recentCards.length, recentTitles: recentCards.slice(0, 4), reticlesInRail: reticles }
})
console.log(JSON.stringify(info, null, 1))
await page.evaluate(() => { const l = document.querySelector('[class*="statusRailPanel"]'); if (l !== null) l.scrollTop = l.scrollHeight })
await page.waitForTimeout(400)
await page.screenshot({ path: 'test/shots/rail-recent.png', clip: { x: 40, y: 40, width: 420, height: 800 } })
await page.close(); await browser.close(); child.kill()
