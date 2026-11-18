import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9791
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'draftcard-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1400,height:1000})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,180)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)

// 找一个没有灯的卡片，给它写草稿
const target = await page.evaluate(() => {
  const cards = Object.values(window.__harness.state?.().cards ?? {})
  const lamped = new Set(['s1','s2','s3','s15'])
  const pick = cards.map(c => c.sessionId).find(id => !lamped.has(id))
  if (pick !== undefined) {
    localStorage.setItem('dsh.conversation.' + pick, JSON.stringify({ draft: '这是待发送的草稿内容' }))
  }
  return pick
})
await page.waitForTimeout(2200)
// 侧栏（地图关闭形态）
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1200)
const side = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => ({
  id: el.getAttribute('data-talkmap-queue'),
  lamp: el.getAttribute('data-lamp'),
  chip: el.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
  body: el.querySelector('[class*="cardSummary"]')?.textContent?.trim().slice(0, 12) ?? null,
})))
console.log('草稿写在:', target)
console.log('侧栏顺序:', JSON.stringify(side))
// 地图侧栏
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1200)
if (await page.evaluate(() => document.querySelector('[class*="statusRailPanel"]')?.getAttribute('aria-hidden')) !== 'false') {
  const tab = await page.evaluate(() => document.querySelector('button[class*="statusRailTab"]') !== null)
  if (tab) { await page.click('button[class*="statusRailTab"]'); await page.waitForTimeout(700) }
}
const rail = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  if (panel === null) return null
  return [...panel.querySelectorAll('[class*="statusRailSlot"]')].map(slot => {
    const card = slot.querySelector('[class*="statusRailCard"]')
    return {
      title: card?.querySelector('[class*="cardTitle"]')?.textContent?.trim() ?? null,
      chip: card?.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
    }
  })
})
console.log('地图侧栏顺序:', JSON.stringify(rail))
console.log('errors:', JSON.stringify(errors))
await page.screenshot({ path: 'test/shots/draft-cards.png', clip: { x: 0, y: 0, width: 420, height: 1000 } })
await browser.close(); child.kill()
