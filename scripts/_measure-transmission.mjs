import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10001
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'tr-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
// 放一张刻意很亮的卡片在侧栏后面，再把侧栏打开
await page.evaluate(() => {
  const key='dsh-talk-map.demo-state.v1'
  const saved=JSON.parse(localStorage.getItem(key)??'null')??{cards:{},edges:{},digests:{},global:{}}
  const cards=saved.cards??{}
  cards['probe-bright']={boardId:'inbox',sessionId:'probe-session',x:-40,y:120,createdAt:Date.now()}
  saved.cards=cards
  localStorage.setItem(key, JSON.stringify(saved))
  localStorage.setItem('dsh.talk-map.status-rail.open.v1','1')
})
await page.reload(); await page.waitForTimeout(2800)
const rect = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const r = panel.getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
})
console.log('面板', JSON.stringify(rect))
const clip = { x: rect.x + 10, y: rect.y + 120, width: 120, height: 90 }
await page.screenshot({ path: 'test/shots/tr-with-panel.png', clip })
await page.evaluate(() => { const p = document.querySelector('[class*="statusRailPanel"]'); if (p) p.style.display='none' })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/tr-without-panel.png', clip })
console.log('两张：有面板 / 无面板')
await page.close(); await browser.close(); child.kill()
