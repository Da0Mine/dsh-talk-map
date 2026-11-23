import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10003
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'var2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2800)
await page.evaluate(() => {
  const layer=document.createElement('div')
  layer.style.cssText='position:fixed;left:0;top:80px;width:360px;height:500px;z-index:5;pointer-events:none;background:linear-gradient(135deg,#ffd166,#ef476f 45%,#4a7cff 100%);'
  document.body.append(layer)
  // 只留玻璃，不留卡片，精确测面板透光
  const style=document.createElement('style')
  style.textContent='[class*="statusRailList"],[class*="statusRailHead"]{visibility:hidden !important}'
  document.head.append(style)
})
await page.waitForTimeout(400)
const rect = await page.evaluate(() => { const r=document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} })
const clip = { x: rect.x, y: rect.y + 160, width: rect.w, height: 120 }
const rows = []
for (const alpha of [0, 20, 30, 45]) {
  await page.evaluate((a) => {
    const panel = document.querySelector('[class*="statusRailPanel"]')
    panel.style.setProperty('background', a === 0 ? 'transparent' : `color-mix(in srgb, var(--dsw-alias-bg-base) ${a}%, transparent)`, 'important')
  }, alpha)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `test/shots/pure-${alpha}.png`, clip })
  rows.push(alpha)
}
console.log('四档纯玻璃截图', JSON.stringify(clip), rows.join(','))
await page.close(); await browser.close(); child.kill()
