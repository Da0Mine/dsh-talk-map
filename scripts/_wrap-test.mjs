import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10031
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'wrap-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => { localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'); localStorage.setItem('dsh.talk-map.status-rail.width.v1','620') })
await page.reload(); await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[class*="statusRailCard"]')].filter(c => !(c.className||'').includes('Dragging'))
  const rects = cards.slice(0, 8).map(c => { const r = c.getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.x), y: Math.round(r.y) } })
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const list = document.querySelector('[class*="statusRailList"]')
  return {
    panelW: panel === null ? null : Math.round(panel.getBoundingClientRect().width),
    cardW: rects.length === 0 ? null : rects[0].w,
    columns: new Set(rects.map(r => r.x)).size,
    firstRects: rects.slice(0, 4),
    panelBackdrop: panel === null ? null : getComputedStyle(panel).backdropFilter,
    cardBackdrop: cards.length === 0 ? null : getComputedStyle(cards[0]).backdropFilter,
    listDisplay: list === null ? null : getComputedStyle(list).display + ' / ' + getComputedStyle(list).flexWrap,
  }
})
console.log(JSON.stringify(info, null, 1))
await page.screenshot({ path: 'test/shots/rail-2col.png', clip: { x: 30, y: 40, width: 700, height: 760 } })
await page.close(); await browser.close(); child.kill()
