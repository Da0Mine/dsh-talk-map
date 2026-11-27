import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10200
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'flow-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const errs = []
page.on('pageerror', e => errs.push(String(e).slice(0, 120)))
await page.addInitScript(() => {
  try { localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1') } catch {}
})
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2000)
// A) 拖动是否恢复：抓一张带灯的卡往下拖，看有没有位移
const before = await page.evaluate(() => [...document.querySelectorAll('[class*="statusRailList"] > [class*="statusRailSlot"]')].map(n => (n.textContent ?? '').slice(0,5)))
const box = await page.evaluate(() => { const c=document.querySelector('[class*="statusRailCard"]'); const r=c.getBoundingClientRect(); return { x: Math.round(r.x+40), y: Math.round(r.y+20) } })
await page.mouse.move(box.x, box.y)
await page.mouse.down()
const moved = []
for (let i=1;i<=5;i+=1){ await page.mouse.move(box.x, box.y + i*24); await page.waitForTimeout(16); moved.push(await page.evaluate(() => { const c=document.querySelector('[class*="statusRailCard"]'); return Math.round(c.getBoundingClientRect().top) })) }
await page.mouse.up()
await page.waitForTimeout(400)
const after = await page.evaluate(() => [...document.querySelectorAll('[class*="statusRailList"] > [class*="statusRailSlot"]')].map(n => (n.textContent ?? '').slice(0,5)))
// B) 完成 → 待查看 → 点开 → 应落到最近的任务
const target = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-talkmap-session]')]
  return cards.length === 0 ? null : cards[0].getAttribute('data-talkmap-session')
})
await page.evaluate((id) => window.__harness.setRunning(id, true), target)
await page.waitForTimeout(1200)
await page.evaluate((id) => window.__harness.setRunning(id, false), target)
await page.waitForTimeout(1200)
const chip = await page.evaluate((id) => {
  const card = document.querySelector('[data-talkmap-session="' + id + '"]')
  return card === null ? null : card.querySelector('[data-talkmap-chip]')?.getAttribute('data-talkmap-chip') ?? null
}, target)
// 点开它（= 看过）
const railCard = await page.evaluate((id) => {
  const slots = [...document.querySelectorAll('[class*="statusRailList"] > [class*="statusRailSlot"]')]
  const hit = slots.find(s => (s.textContent ?? '').length > 0 && s.querySelector('[data-talkmap-session="' + id + '"]') === null && false)
  return null
}, target)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })  // 关地图
await page.waitForTimeout(600)
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })  // 再开
await page.waitForTimeout(1800)
const recent = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return { head: false, list: [] }
  const list = head.parentElement
  return { head: true, list: [...list.children].slice([...list.children].indexOf(head)+1).map(n => (n.textContent ?? '').slice(0,6)) }
})
console.log(JSON.stringify({ before, draggingPositions: moved, after, dragMoved: JSON.stringify(before) !== JSON.stringify(after), chip, recent, errs }, null, 1))
await page.close(); await browser.close(); child.kill()
