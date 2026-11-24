import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10046
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'fullchain-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2400)
const out = await page.evaluate(() => {
  const card = document.querySelector('[class*="statusRailCard"]')
  const rows = []
  for (let el = card; el !== null; el = el.parentElement) {
    const s = getComputedStyle(el)
    rows.push([el.tagName + '.' + (el.className ?? '').toString().split(' ')[0].slice(0, 22), s.transform.slice(0, 18), s.filter.slice(0, 14), s.backdropFilter.slice(0, 16), s.isolation, s.opacity, s.clipPath.slice(0, 10), s.mask.slice(0, 8)].join(' | '))
  }
  return rows
})
console.log(out.join('\n'))
await page.close(); await browser.close(); child.kill()
