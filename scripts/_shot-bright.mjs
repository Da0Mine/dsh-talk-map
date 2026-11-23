import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9941
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'ref-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(3000)
// 在侧栏后面铺一层彩色内容，模拟"玻璃后面有东西"（参考图就是这样才看得出液态感）
await page.evaluate(() => {
  const layer = document.createElement('div')
  layer.id = 'backdrop-demo'
  layer.style.cssText = 'position:fixed;left:0;top:0;width:520px;height:100vh;z-index:5;pointer-events:none;'
  layer.innerHTML = `
    <div style="position:absolute;inset:0;background:
      radial-gradient(60% 40% at 20% 20%, #4a7cff 0%, transparent 60%),
      radial-gradient(50% 40% at 80% 60%, #ff5fa2 0%, transparent 60%),
      radial-gradient(60% 50% at 40% 90%, #22d3a7 0%, transparent 60%),
      #0b0d12;"></div>
    <div style="position:absolute;left:30px;top:80px;width:180px;height:120px;border-radius:14px;
      background:url('https://picsum.photos/360/240') center/cover;opacity:.9"></div>
    <div style="position:absolute;left:60px;top:320px;width:220px;height:150px;border-radius:14px;
      background:linear-gradient(135deg,#ffd166,#ef476f);opacity:.85"></div>`
  document.body.append(layer)
})
await page.waitForTimeout(600)
const box = await page.evaluate(() => {
  const el = document.querySelector('[class*="statusRailPanel"]')
  const r = el.getBoundingClientRect()
  return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width + 220, height: Math.min(r.height, 700) }
})
await page.screenshot({ path: 'test/shots/rail-glass-bright.png', clip: box })
console.log('亮背板截图完成', JSON.stringify(box))
await page.close(); await browser.close(); child.kill()
