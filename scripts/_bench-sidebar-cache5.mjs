import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9899
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cache5-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(3000)

const clear = () => page.evaluate(() => { const p = window.__harness.posts; if (Array.isArray(p)) p.length = 0 })
const count = () => page.evaluate(() => (window.__harness.posts ?? []).filter(p => String(p.url ?? p.path ?? '').includes('last-user')).length)

await clear()
await page.waitForTimeout(2000)
console.log('静置 2s 新请求:', await count())

// 卸掉再挂回侧栏：askedRef 清空，只剩落盘缓存可用
await page.evaluate(() => window.__harness.toggleSidebar())
await page.waitForTimeout(600)
await clear()
await page.evaluate(() => window.__harness.toggleSidebar())
await page.waitForTimeout(3000)
console.log('侧栏重挂后请求:', await count(), '（无缓存复用时这里会是 min(行数,14)）')
const shown = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => ({ id: el.getAttribute('data-talkmap-queue'), body: el.querySelector('[class*="cardSummary"]')?.textContent?.trim().slice(0, 12) ?? null })).slice(0, 4))
console.log('重挂后仍有正文:', JSON.stringify(shown))
await page.close(); await browser.close(); child.kill()
