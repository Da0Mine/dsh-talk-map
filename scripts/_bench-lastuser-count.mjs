import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9905
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cnt-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0]
const page = await context.newPage()
await context.addInitScript(() => {
  const fixed = 1795000000000
  Date.now = () => fixed
  window.__lu = { calls: 0, ids: 0 }
  const original = window.fetch
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input?.url ?? '')
    if (String(url).includes('/talk-map/last-user')) {
      window.__lu.calls += 1
      try { const body = JSON.parse(init?.body ?? '{}'); window.__lu.ids += (body.sessionIds ?? []).length } catch {}
    }
    return original.apply(this, arguments)
  }
})
const altF = () => page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
const stat = () => page.evaluate(() => window.__lu)
const reset = () => page.evaluate(() => { window.__lu.calls = 0; window.__lu.ids = 0 })

await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(3000)
console.log('首屏（地图开）:', JSON.stringify(await stat()))
await page.evaluate(() => localStorage.removeItem('dsh.talk-map.previews.v1'))
await reset(); await altF(); await page.waitForTimeout(3200)
console.log('侧栏挂载·冷缓存:', JSON.stringify(await stat()))
await altF(); await page.waitForTimeout(600)
await reset(); await altF(); await page.waitForTimeout(3200)
console.log('侧栏重挂·热缓存:', JSON.stringify(await stat()))
await page.close(); await browser.close(); child.kill()
