import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9697
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'draft2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
// 选一张真实渲染在画布上的卡片
const target = await page.evaluate(() => {
  const card = document.querySelector('[data-talkmap-session]')
  const sid = card?.getAttribute('data-talkmap-session') ?? null
  const before = card?.querySelector('[class*="cardSummary"]')?.textContent ?? null
  if (sid !== null) {
    const key = 'dsh.conversation.' + sid
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed.draft = '这是待发送的内容，不该被旧消息覆盖'
    localStorage.setItem(key, JSON.stringify(parsed))
  }
  return { sid, before }
})
await page.waitForTimeout(2500)
console.log('目标会话:', JSON.stringify(target))
const info = await page.evaluate(() => {
  const card = document.querySelector('[data-talkmap-session]')
  const stored = localStorage.getItem('dsh.conversation.' + (card?.getAttribute('data-talkmap-session') ?? ''))
  return {
    cardExists: card !== null,
    cardText: (card?.innerText ?? '').slice(0, 160).replace(/\n+/g, ' | '),
    summaryText: card?.querySelector('[class*="cardSummary"]')?.textContent ?? null,
    stored: (stored ?? '').slice(0, 120),
    folded: document.querySelectorAll('[class*="stackCell"]').length,
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close(); child.kill()
