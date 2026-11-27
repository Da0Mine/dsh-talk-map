import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10141
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'menu2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e).slice(0, 120)))
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
// 找一张最近区（无灯）的卡
const recentBox = await page.evaluate(() => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return null
  const list = head.parentElement
  const slot = [...list.children].slice([...list.children].indexOf(head) + 1)[0]
  if (slot === undefined) return null
  const r = slot.getBoundingClientRect()
  return { x: Math.round(r.x + 40), y: Math.round(r.y + 20) }
})
const clickItem = async (label) => {
  await page.mouse.click(recentBox.x, recentBox.y, { button: 'right' })
  await page.waitForTimeout(250)
  await page.evaluate((text) => {
    const el = document.querySelector('[role="menu"]')
    const btn = [...el.querySelectorAll('button')].find(b => b.textContent.includes(text))
    btn?.click()
  }, label)
  await page.waitForTimeout(800)
}
// 标为未读
await clickItem('标为未读')
const lampAfterUnread = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[class*="statusRailCard"]')]
  return cards.some(c => /cardLampDone/.test(c.className))
})
// 查看摘要：不应跳转（地图仍开），且不报错
await clickItem('查看摘要')
const afterDigest = await page.evaluate(() => ({
  mapOpen: document.querySelector('.react-flow__pane') !== null,
  dialog: document.querySelector('[role="dialog"]') !== null || document.querySelector('[class*="menuError"]') !== null,
  menuOpen: document.querySelector('[role="menu"]') !== null,
}))
console.log(JSON.stringify({ lampAfterUnread, afterDigest, errors }, null, 1))
await page.close(); await browser.close(); child.kill()
