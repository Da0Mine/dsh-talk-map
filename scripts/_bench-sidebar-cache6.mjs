import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9901
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cache6-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0]
const page = await context.newPage()
// 冻结时间：demo 的 T0 = Date.now()，不冻的话每次加载 updatedAt 都变，缓存永远算过期
await context.addInitScript(() => { const fixed = 1795000000000; Date.now = () => fixed })

const count = async () => {
  await page.waitForTimeout(3200)
  return page.evaluate(() => (window.__harness.posts ?? []).filter(p => String(p.url ?? p.path ?? '').includes('last-user')).length)
}
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
const cold = await count()
await page.reload()
const warm = await count()
const bodies = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => el.querySelector('[class*="cardSummary"]')?.textContent?.trim().slice(0, 10) ?? null).filter(Boolean).slice(0, 3))
console.log(`冷启动 last-user: ${cold} 次`)
console.log(`同一缓存重载: ${warm} 次`)
console.log('重载后侧栏正文:', JSON.stringify(bodies))
await page.close(); await browser.close(); child.kill()
