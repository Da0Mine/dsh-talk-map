import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10150
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'pinmark-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2000)
// 地图上的 pin（对比基准）
const mapPin = await page.evaluate(() => {
  const el = document.querySelector('[data-talkmap-pin="1"]')
  if (el === null) return null
  const s = getComputedStyle(el)
  return { color: s.color, filter: s.filter, animation: s.animationName, width: el.getBoundingClientRect().width }
})
// 右键置顶第一张，再看侧栏里的 pin 是否同款
const box = await page.evaluate(() => { const c = document.querySelector('[class*="statusRailCard"]'); const r = c.getBoundingClientRect(); return { x: Math.round(r.x + 40), y: Math.round(r.y + 20) } })
await page.mouse.click(box.x, box.y, { button: 'right' })
await page.waitForTimeout(250)
await page.evaluate(() => { const el = document.querySelector('[role="menu"]'); [...el.querySelectorAll('button')].find(b => b.textContent.includes('置顶'))?.click() })
await page.waitForTimeout(600)
const railPin = await page.evaluate(() => {
  const el = document.querySelector('[class*="statusRailCard"] [data-talkmap-pin="1"]')
  if (el === null) return null
  const s = getComputedStyle(el)
  return { color: s.color, filter: s.filter, animation: s.animationName, width: el.getBoundingClientRect().width }
})
console.log(JSON.stringify({ mapPin, railPin, same: JSON.stringify(mapPin) === JSON.stringify(railPin) }, null, 1))
await page.close(); await browser.close(); child.kill()
