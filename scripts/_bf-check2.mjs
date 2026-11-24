import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10043
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'bfcheck-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2400)
const info = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const card = document.querySelector('[class*="statusRailCard"]')
  return { panelBf: getComputedStyle(panel).backdropFilter, cardBf: getComputedStyle(card).backdropFilter }
})
console.log(JSON.stringify(info))
// 把一张高对比图片塞到卡片正后方的画布位置，验证模糊
await page.evaluate(() => {
  const card = document.querySelector('[class*="statusRailCard"]').getBoundingClientRect()
  const img = document.createElement('div')
  img.style.cssText = `position:fixed;left:${Math.round(card.x)}px;top:${Math.round(card.y)}px;width:${Math.round(card.width)}px;height:${Math.round(card.height)}px;z-index:5;pointer-events:none;` +
    'background:repeating-linear-gradient(90deg,#fff 0 4px,#000 4px 8px)'
  document.body.append(img)
})
await page.waitForTimeout(300)
const clip = await page.evaluate(() => { const r = document.querySelector('[class*="statusRailCard"]').getBoundingClientRect(); return { x: Math.round(r.x + 30), y: Math.round(r.y + 30), width: 80, height: 40 } })
await page.screenshot({ path: 'test/shots/bf-on.png', clip })
await page.evaluate(() => { const s=document.createElement('style'); s.textContent='[class*="statusRailPanel"] [class*="card"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'; document.head.append(s) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/bf-off.png', clip })
console.log('对比图已出')
await page.close(); await browser.close(); child.kill()
