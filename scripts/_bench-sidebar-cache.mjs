import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9895
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'cache-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const counts = async (label) => {
  await page.waitForTimeout(2500)
  const n = await page.evaluate(() => (window.__harness.posts ?? []).filter(p => String(p.url ?? p.path ?? '').includes('last-user')).length)
  console.log(`${label}: last-user 请求 ${n} 次`)
  return n
}
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
const cold = await counts('冷缓存（首次启动）')
// 侧栏有正文说明缓存已写入；重载一次模拟"重启后"
await page.reload()
const warm = await counts('热缓存（重载后）')
const cache = await page.evaluate(() => {
  const raw = localStorage.getItem('dsh.talk-map.preview-cache.v1') ?? localStorage.getItem('dsh.talk-map.preview')
  if (raw === null) return { keys: Object.keys(localStorage).filter(k => k.includes('preview')) }
  return { bytes: raw.length, entries: Object.keys(JSON.parse(raw)).length }
})
console.log('预览缓存:', JSON.stringify(cache))
console.log(`节省: ${cold - warm} 次会话读取`)
await page.close(); await browser.close(); child.kill()
