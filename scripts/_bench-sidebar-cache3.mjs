import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9897
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cache3-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()

const count = async (label) => {
  await page.waitForTimeout(3000)
  const n = await page.evaluate(() => (window.__harness.posts ?? []).filter(p => String(p.url ?? p.path ?? '').includes('last-user')).length)
  console.log(`${label}: last-user ${n} 次`)
  return n
}

// 第一次：关地图 → 清缓存 → 重载（此时地图是关的，只有侧栏会请求）
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(2500)
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.removeItem('dsh.talk-map.previews.v1'))
await page.reload()
const cold = await count('侧栏·冷缓存')

// 第二次：不动缓存，再重载 → 侧栏应完全命中缓存
await page.reload()
const warm = await count('侧栏·热缓存')
const cache = await page.evaluate(() => {
  const raw = localStorage.getItem('dsh.talk-map.previews.v1')
  return raw === null ? '无' : `${Object.keys(JSON.parse(raw)).length} 条 / ${Math.round(raw.length / 1024)} KB`
})
console.log('缓存内容:', cache, '| 省下的宿主读取:', cold - warm, '次')
await page.close(); await browser.close(); child.kill()
