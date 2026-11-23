import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10011
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'csp-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=900,700','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const logs = []
page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 200)))
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(2500)
const info = await page.evaluate(() => {
  const meta = [...document.querySelectorAll('meta[http-equiv]')].map(m => ({ http: m.getAttribute('http-equiv'), content: (m.getAttribute('content') ?? '').slice(0, 120) }))
  // 把同一个滤镜套到一个普通 div 上，看它到底出不出图
  const f = document.querySelector('filter')
  const id = f === null ? null : f.id
  document.body.insertAdjacentHTML('beforeend', `
    <div style="position:fixed;left:10px;top:10px;width:240px;height:120px;z-index:9999;background:repeating-linear-gradient(90deg,#ff0 0 12px,#00f 12px 24px)"></div>
    <div id="probe" style="position:fixed;left:10px;top:10px;width:240px;height:120px;z-index:10000;backdrop-filter:url(#${id})"></div>
  `)
  return { meta, id, hasFilter: f !== null }
})
console.log(JSON.stringify(info).slice(0, 800))
await page.waitForTimeout(400)
await page.screenshot({ path: 'test/shots/page-filter-probe.png', clip: { x: 0, y: 0, width: 280, height: 160 } })
console.log('logs:', logs.slice(0, 6).join(' | ').slice(0, 600))
await page.close(); await browser.close(); child.kill()
