import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10210
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'flow2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,120)))
await page.addInitScript(() => {
  const now = Date.now()
  try {
    localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history: { s3: now-3000, s5: now-2000, s7: now-1000 } }))
    localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
  } catch {}
})
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const recentTitles = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return []
  const list = head.parentElement
  return [...list.children].slice([...list.children].indexOf(head)+1).map(n => (n.textContent ?? '').slice(0,5))
})
const boxes = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  const list = head.parentElement
  return [...list.children].slice([...list.children].indexOf(head)+1).map(s => { const r=s.getBoundingClientRect(); return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) } })
})
const before = await recentTitles()
let dragPath = []
if (boxes.length >= 2) {
  await page.mouse.move(boxes[1].x, boxes[1].y)
  await page.mouse.down()
  for (let i=1;i<=8;i+=1){ await page.mouse.move(boxes[1].x, boxes[1].y + (boxes[0].y - boxes[1].y) * (i/8)); await page.waitForTimeout(16); dragPath.push(await page.evaluate(() => { const head=document.querySelector('[class*="statusRailRecentHead"]'); const list=head.parentElement; const s=[...list.children].slice([...list.children].indexOf(head)+1)[1]; return s===undefined?null:Math.round(s.getBoundingClientRect().top) })) }
  await page.mouse.up()
  await page.waitForTimeout(400)
}
const after = await recentTitles()
console.log(JSON.stringify({ before, dragPath, after, changed: JSON.stringify(before)!==JSON.stringify(after), errs }, null, 1))
await page.close(); await browser.close(); child.kill()
