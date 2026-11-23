import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9991
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'rb-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(3000)
const info = await page.evaluate(() => {
  const header = document.querySelector('[class*="tm_header"]')
  const panel = document.querySelector('[class*="tm_panel"]')
  const canvas = document.querySelector('[class*="tm_canvas"]')
  const r = el => el === null ? null : (b => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }))(el.getBoundingClientRect())
  return {
    header: r(header), panel: r(panel), canvas: r(canvas),
    headerPosition: header === null ? null : getComputedStyle(header).position,
    headerBackdrop: header === null ? null : getComputedStyle(header).backdropFilter,
    panelBg: panel === null ? null : getComputedStyle(panel).backgroundColor,
    canvasMarginTop: canvas === null ? null : getComputedStyle(canvas).marginTop,
    railBackdrop: (() => { const p = document.querySelector('[class*="statusRailPanel"]'); return p === null ? null : getComputedStyle(p).backdropFilter })(),
  }
})
console.log(JSON.stringify(info, null, 1))
await page.close(); await browser.close(); child.kill()
