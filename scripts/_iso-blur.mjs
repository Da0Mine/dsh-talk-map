import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10044
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'iso-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1200,800','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(2000)
await page.evaluate(() => {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="stripe" style="position:fixed;left:20px;top:20px;width:300px;height:120px;z-index:9998;background:repeating-linear-gradient(90deg,#fff 0 4px,#000 4px 8px)"></div>
    <div id="plainBlur" style="position:fixed;left:20px;top:20px;width:300px;height:120px;z-index:9999;backdrop-filter:blur(10px)"></div>
  `)
})
await page.waitForTimeout(400)
await page.screenshot({ path: 'test/shots/iso-on.png', clip: { x: 40, y: 40, width: 120, height: 60 } })
await page.evaluate(() => { const el = document.getElementById('plainBlur'); el.style.backdropFilter = 'none' })
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/iso-off.png', clip: { x: 40, y: 40, width: 120, height: 60 } })
console.log('隔离测试完成')
await page.close(); await browser.close(); child.kill()
