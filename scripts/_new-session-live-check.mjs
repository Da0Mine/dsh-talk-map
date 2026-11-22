import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9861
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'newlive-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=(await browser.contexts()[0].newPage())
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,200)))
await page.goto(`http://127.0.0.1:8793/demo/index.html?demo=1`)
await page.waitForTimeout(2800)
// 关掉地图 → 只剩原生侧栏（关键：全程不打开地图）
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1000)
const before = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => el.getAttribute('data-talkmap-queue')))
const hadCard = await page.evaluate(() => Object.values(window.__harness.state().cards ?? {}).some(c => c.sessionId === 's-live'))
await page.evaluate(() => window.__harness.addSession('ws-daily', 's-live', '新会话 · 正在运行', { running: true }))
await page.waitForTimeout(1200)
const after = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-talkmap-queue]')].map(el => ({ id: el.getAttribute('data-talkmap-queue'), lamp: el.getAttribute('data-lamp'), chip: el.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null }))
  const cards = Object.values(window.__harness.state().cards ?? {})
  return { rows, hasCard: cards.some(c => c.sessionId === 's-live'), cardCount: cards.length }
})
console.log('加会话前:', JSON.stringify(before), '该会话是否已有卡:', hadCard)
console.log('加会话后:', JSON.stringify(after.rows))
console.log('该会话此后有卡吗:', after.hasCard, '| 板上卡片总数:', after.cardCount)
console.log('地图面板打开过吗:', await page.evaluate(() => window.__harness.panelState?.()?.selectedPanel ?? null))
console.log('errors:', JSON.stringify(errors))
await page.close(); await browser.close(); child.kill()
