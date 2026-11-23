import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9995
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'br-'+Date.now())}`,'--no-first-run','--headless=new','--hide-scrollbars','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const card = panel?.querySelector('[class*="card"]')
  return {
    panelBg: panel ? getComputedStyle(panel).backgroundColor : null,
    panelShadow: panel ? getComputedStyle(panel).boxShadow.slice(0, 120) : null,
    cardBg: card ? getComputedStyle(card).backgroundColor : null,
    canvasBg: (() => { const c = document.querySelector('[class*="tm_canvas"]'); return c ? getComputedStyle(c).backgroundColor : null })(),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }
})
console.log(JSON.stringify(info, null, 1))
await page.close(); await browser.close(); child.kill()
