import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10160
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'flip-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const geoms = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return []
  const list = head.parentElement
  return [...list.children].slice([...list.children].indexOf(head) + 1).map(slot => {
    const r = slot.getBoundingClientRect()
    return { text: (slot.textContent ?? '').slice(0, 4), top: Math.round(r.top) }
  })
})
const before = await geoms()
if (before.length >= 3) {
  const b = await page.evaluate(() => {
    const head = document.querySelector('[class*="statusRailRecentHead"]')
    const list = head.parentElement
    return [...list.children].slice([...list.children].indexOf(head) + 1).slice(0, 3).map(slot => { const r = slot.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })
  })
  await page.mouse.move(b[2].x, b[2].y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i += 1) { await page.mouse.move(b[2].x, b[2].y + (b[0].y - b[2].y) * (i / 8)); await page.waitForTimeout(16) }
  await page.mouse.up()
  // 松手后逐帧采样第一张卡的位置
  const samples = []
  const start = Date.now()
  while (Date.now() - start < 320) {
    const g = await page.evaluate(() => {
      const head = document.querySelector('[class*="statusRailRecentHead"]')
      const list = head.parentElement
      const slots = [...list.children].slice([...list.children].indexOf(head) + 1)
      const hit = slots.find(slot => (slot.textContent ?? '').startsWith('医学影像'))
      return hit === undefined ? null : Math.round(hit.getBoundingClientRect().top)
    })
    samples.push({ ms: Date.now() - start, top: g })
    await page.waitForTimeout(12)
  }
  console.log(JSON.stringify({ before, after: await geoms(), samples }, null, 1))
}
await page.close(); await browser.close(); child.kill()
