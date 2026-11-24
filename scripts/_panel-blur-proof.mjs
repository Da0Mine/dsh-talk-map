import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10050
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'panelblur-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2500)
await page.evaluate(() => {
  const style=document.createElement('style'); style.textContent='.react-flow{background:transparent !important}'; document.head.append(style)
  const canvas=document.querySelector('[class*="tm_canvas"]')
  const stripes=document.createElement('div')
  stripes.style.cssText='position:absolute;inset:0;z-index:1;pointer-events:none;background:repeating-linear-gradient(90deg,#fff 0 5px,#000 5px 10px)'
  canvas.prepend(stripes)
})
await page.waitForTimeout(400)
// 取面板里卡片之外的空白带（顶部标题区）
const clip = await page.evaluate(() => { const r=document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect(); return { x: Math.round(r.x + 10), y: Math.round(r.y + 34), width: 120, height: 14 } })
await page.screenshot({ path: 'test/shots/panel-bf-on.png', clip })
await page.evaluate(() => { const s=document.createElement('style'); s.textContent='[class*="statusRailPanel"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'; document.head.append(s) })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/panel-bf-off.png', clip })
console.log('面板模糊对比完成', JSON.stringify(clip))
await page.close(); await browser.close(); child.kill()
