import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10023
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'nolamp-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1500)
const keys = await page.evaluate(() => Object.keys(window.__harness ?? {}).slice(0, 40))
console.log('harness keys:', keys.join(','))
const info = await page.evaluate(() => {
  const h = window.__harness ?? {}
  const map = h.uiSession?.sessionStatus
  if (map !== undefined && typeof map.clear === 'function') map.clear()
  const rail = document.querySelector('[class*="statusRail"]')
  return { cleared: map !== undefined, dataOpen: rail?.getAttribute('data-open') ?? null }
})
console.log(JSON.stringify(info))
await page.waitForTimeout(1200)
const after = await page.evaluate(() => {
  const rail = document.querySelector('[class*="statusRail"]')
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const empty = [...document.querySelectorAll('div')].find(d => (d.className ?? '').includes('statusRailEmpty'))
  const count = [...document.querySelectorAll('span')].find(s => (s.className ?? '').includes('statusRailCount'))
  return {
    dataOpen: rail?.getAttribute('data-open') ?? null,
    panelX: panel === null ? null : Math.round(panel.getBoundingClientRect().x),
    panelW: panel === null ? null : Math.round(panel.getBoundingClientRect().width),
    count: count?.textContent ?? null,
    emptyText: empty?.textContent ?? null,
  }
})
console.log(JSON.stringify(after, null, 1))
await page.screenshot({ path: 'test/shots/rail-no-lamp.png', clip: { x: 30, y: 40, width: 520, height: 760 } })
await page.close(); await browser.close(); child.kill()
