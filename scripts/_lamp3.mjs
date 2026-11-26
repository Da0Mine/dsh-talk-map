import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10101
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'lamp2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const chipOf = (id) => page.evaluate((sid) => {
  const card = document.querySelector('[data-talkmap-session="' + sid + '"]')
  return card === null ? null : (card.querySelector('[data-talkmap-chip]') || {}).getAttribute?.('data-talkmap-chip') ?? null
}, id)
const stored = () => page.evaluate(() => localStorage.getItem('dsh.talk-map.lamp-state.v1'))
const target = await page.evaluate(() => {
  const state = window.__harness.state()
  const ids = [...new Set(Object.values(state.cards).map(c => c.sessionId))]
  for (const id of ids) {
    const card = document.querySelector('[data-talkmap-session="' + id + '"]')
    const chip = card === null ? null : card.querySelector('[data-talkmap-chip]')
    if (chip === null) return id
  }
  return ids[0]
})
console.log('target =', target, 'before =', await chipOf(target))
await page.evaluate((id) => window.__harness.setRunning(id, true), target)
await page.waitForTimeout(1500)
await page.evaluate((id) => window.__harness.setRunning(id, false), target)
for (const wait of [800, 2500, 5000]) {
  await page.waitForTimeout(wait === 800 ? 800 : 1700)
  console.log('+' + wait + 'ms chip =', await chipOf(target), '| stored =', (await stored() || '').slice(0, 100))
}
await page.close(); await browser.close(); child.kill()
