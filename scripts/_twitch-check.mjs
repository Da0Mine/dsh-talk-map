import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10190
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'twitch-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.addInitScript(() => {
  const now = Date.now()
  try {
    localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history: { s3: now - 3000, s5: now - 2000, s7: now - 1000 } }))
    localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
  } catch {}
})
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const positions = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return {}
  const list = head.parentElement
  const out = {}
  for (const slot of [...list.children].slice([...list.children].indexOf(head) + 1)) {
    out[(slot.textContent ?? '').slice(0, 4)] = Math.round(slot.getBoundingClientRect().top)
  }
  return out
})
const boxes = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  const list = head.parentElement
  return [...list.children].slice([...list.children].indexOf(head) + 1).map(s => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })
})
if (boxes.length < 2) { console.log('最近区不足两张'); }
else {
  await page.mouse.move(boxes[1].x, boxes[1].y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i += 1) { await page.mouse.move(boxes[1].x, boxes[1].y - i * 18); await page.waitForTimeout(16) }
  const beforeUp = await positions()
  await page.mouse.up()
  const frames = []
  for (let i = 0; i < 10; i += 1) { frames.push(await positions()); await page.waitForTimeout(16) }
  // 未被拖动那张的位移量
  const firstKey = Object.keys(beforeUp)[0]
  const drift = frames.map(f => (f[firstKey] ?? null))
  console.log(JSON.stringify({ beforeUp, driftOfFirstRow: drift }, null, 1))
}
await page.close(); await browser.close(); child.kill()
