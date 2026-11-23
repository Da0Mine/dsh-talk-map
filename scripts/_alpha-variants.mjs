import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10002
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'var-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2800)
// 在侧栏后面铺一张亮卡片（canvas 坐标 → 让它落在面板下方）
await page.evaluate(() => {
  const layer=document.createElement('div')
  layer.id='behind'
  layer.style.cssText='position:fixed;left:0;top:120px;width:340px;height:420px;z-index:5;pointer-events:none;background:linear-gradient(135deg,#ffd166,#ef476f 45%,#4a7cff 100%);border-radius:16px;'
  document.body.append(layer)
})
await page.waitForTimeout(400)
const rect = await page.evaluate(() => { const r=document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} })
const clip = { x: rect.x, y: rect.y + 40, width: Math.min(rect.w, 300), height: 320 }
for (const alpha of [20, 30, 45]) {
  await page.evaluate((a) => {
    const panel = document.querySelector('[class*="statusRailPanel"]')
    panel.style.setProperty('background', `color-mix(in srgb, var(--dsw-alias-bg-base) ${a}%, transparent)`, 'important')
  }, alpha)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `test/shots/alpha-${alpha}.png`, clip })
}
console.log('三档截图完成', JSON.stringify(clip))
await page.close(); await browser.close(); child.kill()
