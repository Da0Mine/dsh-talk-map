import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10060
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'queue-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/test/index.html?demo=1')
await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const root = document.querySelector('[data-talkmap-queue-root="1"]')
  const head = document.querySelector('[class*="sidebarQueueHeadText"]')
  const count = document.querySelector('[class*="sidebarQueueCount"]')
  const cards = document.querySelectorAll('[data-talkmap-queue]')
  return { mounted: root !== null, head: head?.textContent ?? null, count: count?.textContent ?? null, rows: cards.length }
})
console.log(JSON.stringify(info))
const box = await page.evaluate(() => { const r = document.querySelector('[class*="tm_panel"]')?.getBoundingClientRect(); return r ? { x: Math.round(r.x), y: Math.round(r.y), width: Math.min(400, Math.round(r.width)), height: Math.min(860, Math.round(r.height)) } : null })
console.log('panel box', JSON.stringify(box))
await page.screenshot({ path: 'test/shots/queue-board.png' })
await page.close(); await browser.close(); child.kill()
