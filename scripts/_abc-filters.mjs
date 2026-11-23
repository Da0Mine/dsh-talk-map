import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10014
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'abc-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1200,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2600)
// 背景条纹 + 隐藏列表
await page.evaluate(() => {
  const layer=document.createElement('div')
  layer.style.cssText='position:fixed;left:0;top:0;width:520px;height:900px;z-index:1;pointer-events:none;background:repeating-linear-gradient(90deg,#fff 0 16px,#000 16px 32px)'
  document.body.append(layer)
  const s=document.createElement('style'); s.textContent='[class*="statusRailList"]{visibility:hidden !important}'; document.head.append(s)
})
await page.waitForTimeout(300)
const rect = await page.evaluate(() => { const b=document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)} })
const clip = { x: rect.x, y: rect.y + 120, width: rect.w, height: 160 }
const shots = []
// A: 纯反色
await page.evaluate(() => {
  const c=document.createElement('canvas'); c.width=8; c.height=8
  const g=c.getContext('2d'); g.fillStyle='rgb(255,0,0)'; g.fillRect(0,0,8,8)
  const red=c.toDataURL()
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
  svg.setAttribute('width','0'); svg.setAttribute('height','0'); svg.style.position='absolute'
  svg.innerHTML = `<defs>
    <filter id="pa" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/></filter>
    <filter id="pb" x="0" y="0" width="100%" height="100%"><feImage href="${red}" x="0" y="0" width="100%" height="100%"/></filter>
    <filter id="pc" x="0" y="0" width="100%" height="100%"><feImage href="${red}" x="0" y="0" width="200" height="200" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="8" xChannelSelector="R" yChannelSelector="G"/></filter>
  </defs>`
  document.body.append(svg)
})
for (const id of ['pa','pb','pc']) {
  await page.evaluate((fid) => {
    const p=document.querySelector('[class*="statusRailPanel"]')
    p.style.setProperty('backdrop-filter', `url(#${fid})`, 'important')
  }, id)
  await page.waitForTimeout(350)
  const file = `test/shots/step-${id}.png`
  await page.screenshot({ path: file, clip })
  shots.push(file)
}
console.log('三张已出', JSON.stringify(clip))
await page.close(); await browser.close(); child.kill()
