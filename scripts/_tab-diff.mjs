import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10005
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'tabmeas-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','0'))
await page.reload(); await page.waitForTimeout(2400)
// 在按钮后面铺彩色内容
await page.evaluate(() => {
  const layer=document.createElement('div')
  layer.style.cssText='position:fixed;left:56px;top:360px;width:120px;height:140px;z-index:5;pointer-events:none;background:linear-gradient(135deg,#ffd166,#4a7cff);'
  document.body.append(layer)
})
await page.waitForTimeout(300)
const r = await page.evaluate(() => { const t=document.querySelector('[class*="statusRailTab"]').getBoundingClientRect(); return {x:Math.round(t.x),y:Math.round(t.y),w:Math.round(t.width),h:Math.round(t.height)} })
const clip = { x: r.x - 10, y: r.y - 10, width: r.w + 20, height: r.h + 20 }
await page.screenshot({ path: 'test/shots/tab-glass-on.png', clip })
await page.evaluate(() => { const s=document.createElement('style'); s.textContent='[class*="statusRailTab"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'; document.head.append(s) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/tab-glass-off.png', clip })
console.log('tab 对比图已出', JSON.stringify(clip))
await page.close(); await browser.close(); child.kill()
