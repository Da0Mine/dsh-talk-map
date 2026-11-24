import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10032
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'slot-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => { localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'); localStorage.setItem('dsh.talk-map.status-rail.width.v1','620') })
await page.reload(); await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const list = document.querySelector('[class*="statusRailList"]')
  const slots = [...document.querySelectorAll('[class*="statusRailSlot"]')].slice(0, 3)
  const cs = list === null ? null : getComputedStyle(list)
  return {
    listW: list === null ? null : Math.round(list.getBoundingClientRect().width),
    listPad: cs === null ? null : cs.paddingLeft + ' / ' + cs.paddingRight,
    display: cs?.display, wrap: cs?.flexWrap,
    slots: slots.map(s => { const r = s.getBoundingClientRect(); const c = getComputedStyle(s); return { w: Math.round(r.width), display: c.display, flex: c.flex, width: c.width } }),
  }
})
console.log(JSON.stringify(info, null, 1))
await page.close(); await browser.close(); child.kill()
