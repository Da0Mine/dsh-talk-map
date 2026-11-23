import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9904
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cache9-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0]
const page = await context.newPage()
await context.addInitScript(() => { const fixed = 1795000000000; Date.now = () => fixed })
const altF = () => page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
const clear = () => page.evaluate(() => { const p = window.__harness.posts; if (Array.isArray(p)) p.length = 0 })
const count = () => page.evaluate(() => (window.__harness.posts ?? []).filter(p => String(p.url ?? p.path ?? '').includes('last-user')).length)

await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(3000)
// 冷：清缓存 + 清请求 → 关地图（侧栏展开挂载）
await page.evaluate(() => localStorage.removeItem('dsh.talk-map.previews.v1'))
await clear()
await altF()
await page.waitForTimeout(3200)
console.log('侧栏·冷缓存:', await count(), '次')
// 热：开地图（侧栏收起）→ 清请求 → 关地图（重挂，缓存已热）
await altF(); await page.waitForTimeout(600)
await clear()
await altF()
await page.waitForTimeout(3200)
console.log('侧栏·热缓存:', await count(), '次')
const shown = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => el.querySelector('[class*="cardSummary"]')?.textContent?.trim().slice(0, 8) ?? null).slice(0, 3))
console.log('热缓存下正文仍显示:', JSON.stringify(shown))
await page.close(); await browser.close(); child.kill()
