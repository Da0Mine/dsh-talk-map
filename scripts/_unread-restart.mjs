import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10070
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'unread-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/test/index.html?run=' + Date.now())
await page.waitForSelector('.react-flow__node', { timeout: 10000 })
await page.waitForTimeout(1200)
// 打开地图
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"], [class*="backButton"]'); })
const opened = await page.evaluate(() => {
  const btn = document.querySelector('[class*="tm_sidebarEntry"]')
  if (btn !== null) { btn.click(); return true }
  return false
})
await page.waitForTimeout(900)
const target = await page.evaluate(() => {
  const state = window.__harness.state()
  // Pick a card that is idle right now: a running session always outranks the unread mark.
  const nodes = [...document.querySelectorAll('.react-flow__node')]
  for (const node of nodes) {
    const card = state.cards[node.getAttribute('data-id')]
    if (card === undefined) continue
    const chip = node.querySelector('[data-talkmap-chip]')
    const value = chip === null ? null : chip.getAttribute('data-talkmap-chip')
    if (value === null || value === undefined) return card.sessionId
  }
  return null
})
if (target === null) { console.log('没有卡片可测'); }
else {
  await page.evaluate((id) => window.__harness.hostUnread(id), target)
  await page.waitForTimeout(700)
  const before = await page.evaluate((id) => {
    const card = document.querySelector('[data-talkmap-session="' + id + '"]')
    return card === null ? null : card.querySelector('[data-talkmap-chip]')?.getAttribute('data-talkmap-chip') ?? null
  }, target)
  await page.reload()
  await page.waitForSelector('.react-flow__node', { timeout: 10000 })
  await page.waitForTimeout(1200)
  await page.evaluate(() => { const btn = document.querySelector('[class*="tm_sidebarEntry"]'); if (btn !== null) btn.click() })
  await page.waitForTimeout(1100)
  const after = await page.evaluate((id) => {
    const card = document.querySelector('[data-talkmap-session="' + id + '"]')
    const stored = localStorage.getItem('dsh.talk-map.lamp-state.v1')
    return { chip: card === null ? null : card.querySelector('[data-talkmap-chip]')?.getAttribute('data-talkmap-chip') ?? null, stored }
  }, target)
  console.log(JSON.stringify({ target, before, afterChip: after.chip, storedHead: (after.stored ?? '').slice(0, 140) }))
}
await page.close(); await browser.close(); child.kill()
