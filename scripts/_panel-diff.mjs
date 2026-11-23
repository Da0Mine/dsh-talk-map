import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10009
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'panelmeas-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2600)
await page.evaluate(() => {
  const layer=document.createElement('div')
  layer.style.cssText='position:fixed;left:0;top:60px;width:420px;height:700px;z-index:5;pointer-events:none;background:repeating-linear-gradient(90deg,#fff 0 14px,#000 14px 28px)'
  document.body.append(layer)
  const s=document.createElement('style'); s.id='hideCards'; s.textContent='[class*="statusRailList"]{visibility:hidden !important}'; document.head.append(s)
})
await page.waitForTimeout(400)
const r = await page.evaluate(() => { const b=document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)} })
const clip = { x: r.x, y: r.y + 100, width: r.w, height: 200 }
await page.screenshot({ path: 'test/shots/panel-filter-on.png', clip })
await page.evaluate(() => { const s=document.createElement('style'); s.textContent='[class*="statusRailPanel"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'; document.head.append(s) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/panel-filter-off.png', clip })
console.log('面板滤镜开/关对比图', JSON.stringify(clip))
await page.close(); await browser.close(); child.kill()
