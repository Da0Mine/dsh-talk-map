import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10111
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'done-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const anims = await page.evaluate(() => {
  const pick = (cls) => {
    const el = [...document.querySelectorAll('[class*="statusRailCard"]')].find(c => (c.className ?? '').includes(cls))
    return el === undefined ? null : { name: getComputedStyle(el).animationName, dur: getComputedStyle(el).animationDuration }
  }
  return { running: pick('cardLampRunning'), done: pick('cardLampDone'), waiting: pick('cardLampWaiting'), error: pick('cardLampError') }
})
console.log(JSON.stringify(anims, null, 1))
// 最近区拖拽：把第一张拖到第二张位置，看顺序是否变化
const order = async () => page.evaluate(() => [...document.querySelectorAll('[data-talkmap-recent-id]')].map(n => n.getAttribute('data-talkmap-recent-id')))
await page.evaluate(() => {
  // 给最近卡打一个便于读取的标记
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head !== null) {
    const slots = [...head.parentElement.children].slice([...head.parentElement.children].indexOf(head) + 1)
    slots.forEach((slot, i) => { const card = slot.firstElementChild; if (card !== null) card.setAttribute('data-talkmap-recent-id', String(i)) })
  }
})
const before = await order()
const boxes = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return []
  return [...head.parentElement.children].slice([...head.parentElement.children].indexOf(head) + 1).slice(0, 2).map(slot => {
    const r = slot.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
})
if (boxes.length === 2) {
  await page.mouse.move(boxes[0].x, boxes[0].y)
  await page.mouse.down()
  await page.mouse.move(boxes[0].x, boxes[1].y + 10, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => {
    const head = document.querySelector('[class*="statusRailRecentHead"]')
    if (head === null) return []
    return [...head.parentElement.children].slice([...head.parentElement.children].indexOf(head) + 1).map(slot => (slot.firstElementChild?.textContent ?? '').slice(0, 10))
  })
  console.log('拖拽后最近区：', JSON.stringify(after))
} else {
  console.log('最近区不足 2 张，无法测拖拽')
}
await page.close(); await browser.close(); child.kill()
