import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10130
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'reorder2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const titles = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return []
  const list = head.parentElement
  return [...list.children].slice([...list.children].indexOf(head) + 1).map(n => (n.textContent ?? '').slice(0, 6))
})
const boxes = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return []
  const list = head.parentElement
  return [...list.children].slice([...list.children].indexOf(head) + 1).map(s => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })
})
const before = await titles()
const b1 = await boxes()
// 向上拖：最后一张 → 第一张
if (b1.length >= 3) {
  await page.mouse.move(b1[2].x, b1[2].y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i += 1) {
    const y = b1[2].y + (b1[0].y - b1[2].y) * (i / 10)
    await page.mouse.move(b1[2].x, y)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await page.waitForTimeout(500)
}
const afterUp = await titles()
const mapOpen = await page.evaluate(() => document.querySelector('.react-flow__pane') !== null)
console.log(JSON.stringify({ before, afterUp, mapOpenAfterDrag: mapOpen }, null, 1))
await page.close(); await browser.close(); child.kill()
