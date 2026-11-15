import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9695
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'draft-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
// 找到 s13 在地图上的卡片正文（先记录原内容）
const before = await page.evaluate(() => {
  const card = document.querySelector('[data-talkmap-session="s13"]')
  return card?.querySelector('[class*="cardSummary"]')?.textContent?.trim() ?? null
})
// 写入一条草稿
await page.evaluate(() => {
  const key = 'dsh.conversation.s13'
  const raw = localStorage.getItem(key)
  const parsed = raw ? JSON.parse(raw) : {}
  parsed.draft = '这是待发送的内容，不该被旧消息覆盖'
  localStorage.setItem(key, JSON.stringify(parsed))
})
await page.waitForTimeout(2200)
const after = await page.evaluate(() => {
  const card = document.querySelector('[data-talkmap-session="s13"]')
  return {
    summary: card?.querySelector('[class*="cardSummary"]')?.textContent?.trim() ?? null,
    hasDraftChip: card?.querySelector('[data-talkmap-draft]') !== null,
  }
})
console.log('草稿前:', JSON.stringify(before))
console.log('草稿后:', JSON.stringify(after))
await browser.close(); child.kill()
