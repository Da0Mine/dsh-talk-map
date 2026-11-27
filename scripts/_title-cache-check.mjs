import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10260
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'title-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,120)))
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(2500)
const written = await page.evaluate(() => localStorage.getItem('dsh.talk-map.titles.v1'))
// 再把缓存改成中文占位，重载后应直接显示缓存标题
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('dsh.talk-map.titles.v1') ?? '{}')
  const keys = Object.keys(raw).slice(0, 2)
  const seeded = { ...raw }
  const now = Date.now()
  for (const k of keys) seeded[k] = { title: '缓存标题·' + k, at: now }
  localStorage.setItem('dsh.talk-map.titles.v1', JSON.stringify(seeded))
  localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
})
await page.reload()
await page.waitForTimeout(700)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(600)
const early = await page.evaluate(() => [...document.querySelectorAll('[class*="statusRailCard"]')].map(n => (n.textContent ?? '').slice(0, 12)))
await page.waitForTimeout(2500)
const later = await page.evaluate(() => [...document.querySelectorAll('[class*="statusRailCard"]')].map(n => (n.textContent ?? '').slice(0, 12)))
console.log(JSON.stringify({ wroteTitles: written !== null && written.length > 10, early, later, errs }, null, 1))
await page.close(); await browser.close(); child.kill()
