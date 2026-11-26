import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10091
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'recent2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
// 加三个空闲会话（无灯无草稿），它们应当出现在「最近的任务」里
await page.evaluate(() => {
  const hud = window.__harness
  const ws = (hud.state?.().global?.workspaces ?? [])[0]?.id ?? 'ws-daily'
  hud.addSession(ws, 'idle-a', '空闲任务甲')
  hud.addSession(ws, 'idle-b', '空闲任务乙')
  hud.addSession(ws, 'idle-c', '空闲任务丙')
  hud.addSession(ws, 'idle-d', '空闲任务丁')
})
await page.waitForTimeout(1500)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2000)
const info = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const allCards = [...document.querySelectorAll('[class*="statusRailCard"]')].map(c => (c.textContent ?? '').slice(0, 12))
  return { hasHead: head !== null, headText: head?.textContent ?? null, cardCount: allCards.length, cards: allCards.slice(-6), reticles: document.querySelectorAll('[class*="cardReticle"]').length, scrollH: panel?.scrollHeight, clientH: panel?.clientHeight }
})
console.log(JSON.stringify(info, null, 1))
await page.evaluate(() => { const p = document.querySelector('[class*="statusRailPanel"]'); if (p !== null) p.scrollTop = p.scrollHeight })
await page.waitForTimeout(400)
await page.screenshot({ path: 'test/shots/rail-recent.png', clip: { x: 40, y: 40, width: 430, height: 820 } })
await page.close(); await browser.close(); child.kill()
