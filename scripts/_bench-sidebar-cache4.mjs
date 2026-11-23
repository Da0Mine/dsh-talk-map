import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9898
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cache4-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()

const sidebarOnly = async (label, closeMap) => {
  await page.waitForTimeout(2200)
  if (closeMap) {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
    await page.waitForTimeout(1200)
  }
  await page.evaluate(() => { const p = window.__harness.posts; if (Array.isArray(p)) p.length = 0 })
  await page.waitForTimeout(3500)
  const n = await page.evaluate(() => (window.__harness.posts ?? []).filter(p => String(p.url ?? p.path ?? '').includes('last-user')).length)
  console.log(`${label}: ${n} 次`)
  return n
}

await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(2500)
await page.evaluate(() => localStorage.removeItem('dsh.talk-map.previews.v1'))
await page.reload()
const cold = await sidebarOnly('侧栏·冷缓存（地图已关）', true)
await page.reload()
const warm = await sidebarOnly('侧栏·热缓存（地图已关）', true)
console.log('省下的宿主读取:', cold - warm, '次')
await page.close(); await browser.close(); child.kill()
