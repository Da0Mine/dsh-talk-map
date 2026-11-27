import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10220
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
async function run(seedRead, label) {
  const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'read-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
  let ready=false; const t0=Date.now()
  while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
  const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  const page=await browser.contexts()[0].newPage()
  await page.addInitScript((seed) => {
    const now = Date.now()
    try {
      localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history: { s3: now - 90000, s4: now - 85000, s5: now - 80000, s7: now - 75000 } }))
      localStorage.setItem('dsh.talk-map.read-finished.v1', JSON.stringify(seed))
      localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
    } catch {}
  }, seedRead)
  await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
  await page.waitForTimeout(1200)
  await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
  await page.waitForTimeout(2200)
    const list = await page.evaluate(() => {
    const head = document.querySelector('[class*="statusRailRecentHead"]')
    if (head === null) return []
    const p = head.parentElement
    return [...p.children].slice([...p.children].indexOf(head)+1).map(n => (n.textContent ?? '').slice(0,6))
  })
  console.log(label, JSON.stringify(list))
  await page.close(); await browser.close(); child.kill()
  await new Promise(r => setTimeout(r, 800))
}
const now = Date.now()
await run({ s3: now - 40000, s4: now - 10000, s5: now - 30000, s7: now - 20000 }, '最后看 s4 → 期望 s4 在顶:')
await run({ s3: now - 10000, s4: now - 40000, s5: now - 20000, s7: now - 30000 }, '最后看 s3 → 期望 s3 在顶:')
