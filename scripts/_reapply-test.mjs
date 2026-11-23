import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10015
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'reapply-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1200,900','about:blank'],{stdio:'ignore'})
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
  layer.style.cssText='position:fixed;left:0;top:0;width:520px;height:900px;z-index:1;pointer-events:none;background:repeating-linear-gradient(90deg,#fff 0 16px,#000 16px 32px)'
  document.body.append(layer)
  const s=document.createElement('style'); s.textContent='[class*="statusRailList"]{visibility:hidden !important}'; document.head.append(s)
})
const rect = await page.evaluate(() => { const b=document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)} })
const clip = { x: rect.x, y: rect.y + 120, width: rect.w, height: 160 }
await page.screenshot({ path: 'test/shots/reapply-before.png', clip })
// 摘掉再挂回
const id = await page.evaluate(() => {
  const p=document.querySelector('[class*="statusRailPanel"]')
  const cur=getComputedStyle(p).backdropFilter
  const m=/url\("?#([^)"]+)/.exec(cur)
  p.style.setProperty('backdrop-filter','none','important')
  void p.offsetHeight
  return m === null ? null : m[1]
})
await page.waitForTimeout(200)
await page.evaluate((fid) => {
  const p=document.querySelector('[class*="statusRailPanel"]')
  p.style.setProperty('backdrop-filter', `url(#${fid})`, 'important')
}, id)
await page.waitForTimeout(600)
await page.screenshot({ path: 'test/shots/reapply-after.png', clip })
console.log('重挂对比图已出, filter=', id)
await page.close(); await browser.close(); child.kill()
