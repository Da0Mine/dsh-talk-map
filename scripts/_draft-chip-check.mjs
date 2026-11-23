import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9871
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'chip-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,160)))
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(2800)
// 给"正在运行"的 s1 写一条草稿
await page.evaluate(() => localStorage.setItem('dsh.conversation.s1', JSON.stringify({ draft: '这条还没发出去' })))
await page.waitForTimeout(2200)
// 侧栏（关地图）
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1200)
const side = await page.evaluate(() => {
  const el = document.querySelector('[data-talkmap-queue="s1"]')
  return el === null ? null : { chips: [...el.querySelectorAll('[class*="cardChip"]')].map(c => c.textContent.trim()), body: el.querySelector('[class*="cardSummary"]')?.textContent?.trim().slice(0,10) }
})
console.log('侧栏 s1（运行中+草稿）:', JSON.stringify(side))
// 地图 rail
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1400)
const rail = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  if (panel === null) return null
  const slots = [...panel.querySelectorAll('[class*="statusRailSlot"]')]
  const card = slots.map(s => s.querySelector('[class*="statusRailCard"]')).find(c => c?.querySelector('[class*="cardTitle"]')?.textContent?.includes('产品官网重构'))
  return card === undefined ? null : { chips: [...card.querySelectorAll('[class*="cardChip"]')].map(c => c.textContent.trim()) }
})
console.log('rail 产品官网重构（运行中+草稿）:', JSON.stringify(rail))
console.log('errors:', JSON.stringify(errors))
await page.close(); await browser.close(); child.kill()
