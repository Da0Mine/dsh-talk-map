import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10180
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'hist-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.addInitScript(() => {
  const now = Date.now()
  try {
    localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history: { s3: now - 3000, s5: now - 2000, s7: now - 1000 } }))
    localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
  } catch {}
})
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const recent = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return { head: false, list: [] }
  const list = head.parentElement
  return { head: true, list: [...list.children].slice([...list.children].indexOf(head) + 1).map(n => (n.textContent ?? '').slice(0, 6)) }
})
const dbg = await page.evaluate(() => {
  const raw = localStorage.getItem('dsh.talk-map.lamp-state.v1')
  const state = window.__harness.state()
  const cards = Object.entries(state.cards ?? {}).map(([id, c]) => ({ id, session: c.sessionId, board: c.boardId }))
  return { raw: (raw ?? '').slice(0, 200), cards, sessionIds: Object.keys(state.sessions?.byId ?? {}) }
})
console.log('DBG', JSON.stringify(dbg).slice(0, 600))
const first = await recent()
// 再次刷新（模拟重启）：最近区应保留
await page.reload()
await page.waitForTimeout(1500)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2000)
const afterReload = await recent()
console.log(JSON.stringify({ first, afterReload }, null, 1))
await page.close(); await browser.close(); child.kill()
