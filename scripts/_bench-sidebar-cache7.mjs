import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9902
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cache7-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0]
const page = await context.newPage()
await context.addInitScript(() => { const fixed = 1795000000000; Date.now = () => fixed })
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(3000)
const diag = async (label) => {
  const info = await page.evaluate(() => ({
    rows: document.querySelectorAll('[data-talkmap-queue]').length,
    chips: [...document.querySelectorAll('[data-talkmap-queue]')].map(el => el.getAttribute('data-lamp')).slice(0, 6),
    bodies: [...document.querySelectorAll('[data-talkmap-queue]')].map(el => el.querySelector('[class*="cardSummary"]')?.textContent?.trim().slice(0, 8) ?? null).slice(0, 4),
    panel: window.__harness.panelState?.()?.selectedPanel ?? null,
    sidebar: window.__harness.sidebarState?.()?.collapsed ?? null,
  }))
  console.log(label, JSON.stringify(info))
}
await diag('冷启动后')
await page.reload(); await page.waitForTimeout(3000)
await diag('热缓存重载后')
await page.close(); await browser.close(); child.kill()
