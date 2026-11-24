import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10041
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'blurproof-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2600)
// 高对比条纹铺在侧栏后面
await page.evaluate(() => {
  const layer = document.createElement('div')
  layer.style.cssText = 'position:fixed;left:0;top:0;width:420px;height:900px;z-index:1;pointer-events:none;background:repeating-linear-gradient(90deg,#fff 0 6px,#000 6px 12px)'
  document.body.append(layer)
})
await page.waitForTimeout(300)
const rect = await page.evaluate(() => { const r = document.querySelector('[class*="statusRailCard"]').getBoundingClientRect(); return { x: Math.round(r.x + 20), y: Math.round(r.y + 20), width: 60, height: 40 } })
await page.screenshot({ path: 'test/shots/blur-on.png', clip: rect })
await page.evaluate(() => { const s=document.createElement('style'); s.textContent='[class*="statusRailPanel"] [class*="card"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'; document.head.append(s) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/blur-off.png', clip: rect })
console.log('对比图已出', JSON.stringify(rect))
await page.close(); await browser.close(); child.kill()
