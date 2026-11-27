import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10140
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'pin-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
page.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 160)))
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const railOrder = () => page.evaluate(() => [...document.querySelectorAll('[class*="statusRailList"] > [class*="statusRailSlot"]')].map(n => (n.textContent ?? '').slice(0, 8)))
const before = await railOrder()
// 右键最后一张卡 → 置顶
const boxes = await page.evaluate(() => [...document.querySelectorAll('[class*="statusRailList"] > [class*="statusRailSlot"]')].map(s => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x + 40), y: Math.round(r.y + 20) } }))
const target = boxes[boxes.length - 1]
await page.mouse.click(target.x, target.y, { button: 'right' })
await page.waitForTimeout(300)
const portal = await page.evaluate(() => {
  const el = document.querySelector('[role="menu"]')
  return el === null ? null : { inBody: el.parentElement === document.body, items: [...el.querySelectorAll('button')].map(b => b.textContent.trim()) }
})
await page.evaluate(() => {
  const el = document.querySelector('[role="menu"]')
  const btn = [...el.querySelectorAll('button')].find(b => b.textContent.includes('置顶'))
  btn?.click()
})
await page.waitForTimeout(700)
const pins = await page.evaluate(() => localStorage.getItem('dsh.talk-map.pins.v1'))
const after = await railOrder()
console.log(JSON.stringify({ portal, pins, before, after, reordered: JSON.stringify(before) !== JSON.stringify(after) }, null, 1))
await page.close(); await browser.close(); child.kill()
