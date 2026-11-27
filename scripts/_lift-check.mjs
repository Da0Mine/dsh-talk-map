import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10230
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'lift-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,120)))
await page.addInitScript(() => {
  const now = Date.now()
  try {
    // 已有两条旧记录，且手动顺序把 s7 放在顶
    localStorage.setItem('dsh.talk-map.lamp-state.v1', JSON.stringify({ version: 1, finished: {}, errors: {}, interrupted: {}, history: { s3: now - 90000, s7: now - 80000 } }))
    localStorage.setItem('dsh.talk-map.read-finished.v1', JSON.stringify({ s3: now - 70000, s7: now - 60000 }))
    localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
  } catch {}
})
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const titles = () => page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return []
  const p = head.parentElement
  return [...p.children].slice([...p.children].indexOf(head)+1).map(n => (n.textContent ?? '').slice(0,6))
})
const before = await titles()
// 让一个新会话完成 → 待查看 → 点它（= 看过）
const target = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-talkmap-session]')].map(n => n.getAttribute('data-talkmap-session'))
  return cards.find(id => id !== 's3' && id !== 's7') ?? cards[0]
})
await page.evaluate((id) => window.__harness.setRunning(id, true), target)
await page.waitForTimeout(1200)
await page.evaluate((id) => window.__harness.setRunning(id, false), target)
await page.waitForTimeout(1200)
// 点最近出现的这张灯卡（第一张有灯的）
const clicked = await page.evaluate(() => {
  const card = document.querySelector('[class*="statusRailCard"]')
  if (card === null) return false
  card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }))
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  return true
})
await page.waitForTimeout(900)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(700)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(1800)
const after = await titles()
console.log(JSON.stringify({ target, clicked, before, after, topAfter: after[0] ?? null, errs }, null, 1))
await page.close(); await browser.close(); child.kill()
