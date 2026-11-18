import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9771
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'parity-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1400,height:900})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,160)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)

// A) 地图打开 → 读侧栏 rail 的卡片（sessionId + 灯）
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', altKey: true })))
await page.waitForTimeout(1200)
const rail = await page.evaluate(() => {
  const tab = document.querySelector('button[class*="statusRailTab"]')
  return [...document.querySelectorAll('[class*="statusRailSlot"] [data-talkmap-session]')].map(el => ({
    id: el.getAttribute('data-talkmap-session'),
    chip: el.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
  }))
})
// 若 rail 未展开，点一下把手
if (rail.length === 0) {
  const hasTab = await page.evaluate(() => document.querySelector('button[class*="statusRailTab"]') !== null)
  if (hasTab) { await page.click('button[class*="statusRailTab"]'); await page.waitForTimeout(600) }
}
const rail2 = await page.evaluate(() => {
  // The rail renders real cards; map each slot's card to its session via the title text.
  const panel = document.querySelector('[class*="statusRailPanel"]')
  if (panel === null) return []
  return [...panel.querySelectorAll('[class*="statusRailSlot"]')].map(slot => {
    const card = slot.querySelector('[class*="statusRailCard"]')
    return {
      title: card?.querySelector('[class*="cardTitle"]')?.textContent?.trim() ?? null,
      chip: card?.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
    }
  })
})

// B) 关地图（侧栏展开）→ 读原生侧栏队列
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1000)
const side = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => ({
  id: el.getAttribute('data-talkmap-queue'),
  lamp: el.getAttribute('data-lamp'),
  chip: el.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
})))
console.log('地图侧栏:', JSON.stringify(rail2))
console.log('原生侧栏:', JSON.stringify(side))
const railTitles = rail2.map(r => r.title).sort().join('|')
const sideTitles = await page.evaluate(() => [])
console.log('rail 标题:', railTitles)
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
