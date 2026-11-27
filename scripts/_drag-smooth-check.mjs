import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10170
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'drag2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
// 先把几张卡标记为"已查看"，最近区才有内容
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=seed`)
await page.evaluate(() => {
  const now = Date.now()
  localStorage.setItem('dsh.talk-map.read-finished.v1', JSON.stringify({ s3: now, s5: now, s7: now }))
  localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
})
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const titles = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return { head: false, list: [] }
  const list = head.parentElement
  return { head: true, list: [...list.children].slice([...list.children].indexOf(head) + 1).map(n => (n.textContent ?? '').slice(0, 6)) }
})
const initial = await titles()
const geomOf = (prefix) => page.evaluate((p) => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return null
  const list = head.parentElement
  const hit = [...list.children].slice([...list.children].indexOf(head) + 1).find(n => (n.textContent ?? '').startsWith(p))
  return hit === undefined ? null : Math.round(hit.getBoundingClientRect().top)
}, prefix)
let during = []
if (initial.list.length >= 2) {
  const boxes = await page.evaluate(() => {
    const head = document.querySelector('[class*="statusRailRecentHead"]')
    const list = head.parentElement
    return [...list.children].slice([...list.children].indexOf(head) + 1).map(s => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })
  })
  const name = initial.list[0]
  await page.mouse.move(boxes[0].x, boxes[0].y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i += 1) {
    await page.mouse.move(boxes[0].x, boxes[0].y + i * 20)
    await page.waitForTimeout(16)
    during.push(await geomOf(name))
  }
  const midY = boxes[0].y + 120
  await page.mouse.move(boxes[0].x, midY)
  await page.mouse.up()
  const after = []
  const start = Date.now()
  while (Date.now() - start < 260) { after.push(await geomOf(name)); await page.waitForTimeout(14) }
  console.log(JSON.stringify({ initial, during, afterFirst: after.slice(0, 8) }, null, 1))
} else {
  console.log(JSON.stringify({ initial, note: '最近区没有卡片，无法拖动' }, null, 1))
}
await page.close(); await browser.close(); child.kill()
