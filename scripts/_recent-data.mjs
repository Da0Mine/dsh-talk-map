import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10092
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'recent3-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1500)
const info = await page.evaluate(() => {
  const state = window.__harness.state()
  const cards = Object.entries(state.cards ?? {})
  return {
    cardCount: cards.length,
    sample: cards.slice(0, 8).map(([id, c]) => ({ id, sessionId: c.sessionId, boardId: c.boardId })),
    statusKeys: [...(window.__harness.statusSnapshot?.() ?? [])].slice?.(0, 10) ?? 'n/a',
  }
})
console.log(JSON.stringify(info, null, 1).slice(0, 900))
await page.close(); await browser.close(); child.kill()
