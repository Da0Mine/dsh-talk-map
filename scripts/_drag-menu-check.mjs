import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10120
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'menu-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const recentTitles = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return []
  const list = head.parentElement
  return [...list.children].slice([...list.children].indexOf(head) + 1).map(n => (n.textContent ?? '').slice(0, 8))
})
const before = await recentTitles()
const box = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return null
  const list = head.parentElement
  const slots = [...list.children].slice([...list.children].indexOf(head) + 1).slice(0, 2)
  return slots.map(s => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + 30) } })
})
let after = before
if (box !== null && box.length === 2) {
  await page.mouse.move(box[0].x, box[0].y)
  await page.mouse.down()
  await page.mouse.move(box[0].x, box[1].y + 20, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  after = await recentTitles()
}
// 右键菜单
const cardBox = await page.evaluate(() => {
  const c = document.querySelector('[class*="statusRailCard"]')
  const r = c.getBoundingClientRect()
  return { x: Math.round(r.x + 40), y: Math.round(r.y + 20) }
})
await page.mouse.click(cardBox.x, cardBox.y, { button: 'right' })
await page.waitForTimeout(400)
const menu = await page.evaluate(() => {
  const el = document.querySelector('[class*="railMenu"]')
  if (el === null) return null
  return [...el.querySelectorAll('button')].map(b => (b.textContent ?? '').trim())
})
console.log(JSON.stringify({ recentBefore: before, recentAfter: after, changed: JSON.stringify(before) !== JSON.stringify(after), menu }, null, 1))
await page.close(); await browser.close(); child.kill()
