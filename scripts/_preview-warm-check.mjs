import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10250
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'warm-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('dsh.talk-map.status-rail.open.v1','1') } catch {} })
const started = Date.now()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
const samples = []
for (let i=0;i<30;i+=1) {
  const n = await page.evaluate(() => document.querySelectorAll('[class*="statusRailCard"] [class*="cardSummary"]').length)
  samples.push({ ms: Date.now()-started, withBody: n })
  if (n >= 3) break
  await page.waitForTimeout(150)
}
console.log(JSON.stringify({ firstReach3: samples.at(-1), samples: samples.slice(0, 12) }, null, 1))
await page.close(); await browser.close(); child.kill()
