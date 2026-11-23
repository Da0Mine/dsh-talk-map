import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9942
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'ab-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2600)
await page.evaluate(() => {
  const layer = document.createElement('div')
  layer.style.cssText = 'position:fixed;left:0;top:0;width:520px;height:100vh;z-index:5;pointer-events:none;background:radial-gradient(60% 40% at 20% 20%, #4a7cff 0%, transparent 60%),radial-gradient(50% 40% at 80% 60%, #ff5fa2 0%, transparent 60%),radial-gradient(60% 50% at 40% 90%, #22d3a7 0%, transparent 60%),#0b0d12;'
  document.body.append(layer)
})
await page.waitForTimeout(500)
const box = await page.evaluate(() => {
  const r = document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect()
  return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.round(r.width), height: Math.min(r.height, 660) }
})
await page.screenshot({ path: 'test/shots/state-rest.png', clip: box })
// 强制冻结态（模拟拖动中）
await page.evaluate(() => document.querySelector('[class*="statusRail"]').setAttribute('data-frozen','1'))
await page.waitForTimeout(250)
await page.screenshot({ path: 'test/shots/state-frozen.png', clip: box })
console.log('两张状态截图完成', JSON.stringify(box))
await page.close(); await browser.close(); child.kill()
