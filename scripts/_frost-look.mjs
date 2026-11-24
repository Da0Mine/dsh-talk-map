import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10048
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'look-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2500)
await page.evaluate(() => { const flow = document.querySelector('.react-flow'); flow.style.backgroundImage = 'repeating-linear-gradient(90deg,#fff 0 4px,#000 4px 8px)' })
await page.waitForTimeout(400)
await page.screenshot({ path: 'test/shots/frost-look.png', clip: { x: 30, y: 40, width: 700, height: 420 } })
const info = await page.evaluate(() => {
  const flow = document.querySelector('.react-flow')
  const frost = document.querySelector('[class*="statusRailFrost"]')
  const fr = frost === null ? null : frost.getBoundingClientRect()
  return { flowBg: getComputedStyle(flow).backgroundImage.slice(0, 60), frostRect: fr === null ? null : { x: Math.round(fr.x), w: Math.round(fr.width) }, frostBf: frost === null ? null : getComputedStyle(frost).backdropFilter }
})
console.log(JSON.stringify(info))
await page.close(); await browser.close(); child.kill()
