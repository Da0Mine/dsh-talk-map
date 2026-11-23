import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9994
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'diag-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(3000)
const info = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const tab = document.querySelector('[class*="statusRailTab"]')
  const svgs = [...document.querySelectorAll('svg[id*="liquid-glass"]')].map(s => ({ id: s.id, filters: [...s.querySelectorAll('filter')].map(f => ({ id: f.id, w: f.getAttribute('width'), h: f.getAttribute('height') })) }))
  const filters = [...document.querySelectorAll('filter')].map(f => ({ id: f.id, w: f.getAttribute('width'), h: f.getAttribute('height'), imgs: f.querySelectorAll('feImage').length }))
  return {
    frozen: document.querySelector('[class*="statusRail"][data-open]')?.getAttribute('data-frozen'),
    panelFilter: panel === null ? null : getComputedStyle(panel).backdropFilter,
    tabFilter: tab === null ? null : getComputedStyle(tab).backdropFilter,
    svgCount: svgs.length, svgs, filters,
  }
})
console.log(JSON.stringify(info, null, 1).slice(0, 1600))
await page.close(); await browser.close(); child.kill()
