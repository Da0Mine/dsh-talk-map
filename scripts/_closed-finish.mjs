import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10102
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'closed-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(2000)  // 地图保持关闭
// 挑一个非主视图的会话
const target = await page.evaluate(() => {
  const state = window.__harness.state()
  const ids = [...new Set(Object.values(state.cards).map(c => c.sessionId))]
  const main = Object.values(state.sessions?.byId ?? {}).filter(s => (s.retainedBy?.mainView ?? 0) > 0).map(s => s.id)
  return ids.find(id => !main.includes(id)) ?? ids[0]
})
console.log('地图关闭态，目标会话 =', target)
await page.evaluate((id) => window.__harness.setRunning(id, true), target)
await page.waitForTimeout(1500)
await page.evaluate((id) => window.__harness.setRunning(id, false), target)
await page.waitForTimeout(2500)
const stored = await page.evaluate(() => localStorage.getItem('dsh.talk-map.lamp-state.v1'))
// 打开地图看看这张卡有没有灯
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(1800)
const chip = await page.evaluate((id) => {
  const card = document.querySelector('[data-talkmap-session="' + id + '"]')
  return card === null ? null : card.querySelector('[data-talkmap-chip]')?.getAttribute('data-talkmap-chip') ?? null
}, target)
const inRecent = await page.evaluate((id) => {
  const head = document.querySelector('[class*="statusRailRecentHead"]')
  if (head === null) return false
  const list = head.parentElement
  const idx = [...list.children].indexOf(head)
  const after = [...list.children].slice(idx + 1).map(n => n.textContent ?? '')
  return after.some(text => text.includes(id))
}, target)
console.log(JSON.stringify({ stored, chip, inRecent }, null, 1))
await page.close(); await browser.close(); child.kill()
