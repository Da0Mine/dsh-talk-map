import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10081
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'calls-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const run = async (cards) => {
  await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
  await page.waitForTimeout(700)
  await page.evaluate((n) => {
    const key = 'dsh-talk-map.demo-state.v1'
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') ?? { cards: {}, edges: {}, digests: {}, global: {} }
    const map = {}
    for (let i = 0; i < n; i += 1) {
      const id = 'call-' + i
      map[id] = { boardId: 'inbox', sessionId: 's' + (i % 8 + 1), x: (i % 8) * 280, y: Math.floor(i / 8) * 200, createdAt: Date.now() - i * 1000 }
    }
    saved.cards = map
    localStorage.setItem(key, JSON.stringify(saved))
    localStorage.removeItem('dsh.talk-map.preview-cache.v1')
  }, cards)
  await page.reload()
  await page.waitForSelector('.react-flow__node', { timeout: 12000 }).catch(() => null)
  await page.waitForTimeout(1500)
  const before = await page.evaluate(() => window.__harness.lastUserCalls())
  await page.evaluate(() => { const b = document.querySelector('[class*="tm_sidebarEntry"]'); if (b !== null) b.click() })
  await page.waitForTimeout(30000)
  const after = await page.evaluate(() => window.__harness.lastUserCalls())
  const nodes = await page.evaluate(() => document.querySelectorAll('.react-flow__node').length)
  return { cards, nodes, callsIn30s: after - before, perMin: (after - before) * 2 }
}
for (const n of [0, 50, 200]) console.log(JSON.stringify(await run(n)))
await page.close(); await browser.close(); child.kill()
