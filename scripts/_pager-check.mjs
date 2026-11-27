import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10240
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'page-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.addInitScript(() => {
  const now = Date.now()
  const ids = { s1: 1, s2: 2, s3: 3, s4: 4, s5: 5, s6: 6, s7: 7, s9: 9, s10: 10 }
  const history = {}
  const read = {}
  for (const [id, k] of Object.entries(ids)) {
    history[id] = now - 100000 + k * 1000
    read[id] = now - 50000 + k * 1000
  }
  try {
    localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history }))
    localStorage.setItem('dsh.talk-map.read-finished.v1', JSON.stringify(read))
    localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
  } catch {}
})
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const count = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return { cards: 0, more: false }
  const p = head.parentElement
  const kids = [...p.children].slice([...p.children].indexOf(head)+1)
  return {
    cards: kids.filter(k => (k.className ?? '').toString().includes('statusRailSlot')).length,
    more: kids.some(k => (k.className ?? '').toString().includes('statusRailMore')),
  }
})
const initial = await count()
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('[class*="statusRailMore"]')][0]
  if (btn === undefined) return false
  btn.click()
  return true
})
await page.waitForTimeout(500)
const afterClick = await count()
console.log(JSON.stringify({ initial, clicked, afterClick }, null, 1))
await page.close(); await browser.close(); child.kill()
