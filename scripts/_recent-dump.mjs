import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10093
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'recent4-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const dump = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const list = panel?.querySelector('[class*="statusRailList"]')
  const kids = list === null ? [] : [...list.children].map(k => ({ cls: (k.className ?? '').toString().slice(0, 40), text: (k.textContent ?? '').slice(0, 14), lamp: /cardLamp/.test((k.firstElementChild?.className ?? '').toString() + (k.className ?? '')) }))
  return { kids, slotCount: list?.querySelectorAll('[class*="statusRailSlot"]').length ?? -1, hasHead: document.querySelector('[class*="statusRailRecentHead"]') !== null }
})
console.log(JSON.stringify(dump, null, 1).slice(0, 1600))
await page.close(); await browser.close(); child.kill()
