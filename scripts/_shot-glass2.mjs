import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9912
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'glass2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0]
const page = await context.newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1500)
await page.evaluate(() => { localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1'); document.body.setAttribute('data-ds-dark-theme', '') })
await page.reload()
await page.waitForTimeout(3000)
const shot = async (name) => {
  const box = await page.evaluate(() => {
    const el = document.querySelector('[class*="statusRailPanel"]')
    if (el === null) return null
    const r = el.getBoundingClientRect()
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width + 200, 460), height: Math.min(r.height, 720) }
  })
  if (box === null) return console.log('没找到 rail')
  await page.screenshot({ path: `test/shots/${name}.png`, clip: box })
  console.log('截图:', name, JSON.stringify(box))
}
await shot('rail-glass-dark')
await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))
await page.waitForTimeout(500)
await shot('rail-glass-light')
await page.close(); await browser.close(); child.kill()
