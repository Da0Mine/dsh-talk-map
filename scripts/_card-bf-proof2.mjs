import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10045
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'bfcanvas-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2500)
// 把条纹铺到画布容器自身（卡片真正能"看穿"的层）
await page.evaluate(() => {
  const flow = document.querySelector('.react-flow')
  flow.style.backgroundImage = 'repeating-linear-gradient(90deg,#fff 0 4px,#000 4px 8px)'
})
await page.waitForTimeout(300)
const clip = await page.evaluate(() => { const r = document.querySelector('[class*="statusRailCard"]').getBoundingClientRect(); return { x: Math.round(r.x + 40), y: Math.round(r.y + 40), width: 100, height: 40 } })
await page.screenshot({ path: 'test/shots/card-bf-on.png', clip })
await page.evaluate(() => { const s=document.createElement('style'); s.textContent='[class*="statusRailPanel"] [class*="card"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'; document.head.append(s) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/card-bf-off.png', clip })
console.log('画布条纹对比图已出', JSON.stringify(clip))
await page.close(); await browser.close(); child.kill()
