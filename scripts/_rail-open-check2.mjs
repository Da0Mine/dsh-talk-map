import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9683
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'railopen2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,150)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
const openMap = async () => {
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
  await page.waitForTimeout(700)
}
// the demo already boots with the map open (Alt+F would close it)
const openRail = async () => {
  const open = await page.evaluate(() => document.querySelector('.tm_statusRail')?.getAttribute('data-open'))
  if (open !== '1') { await page.click('button.tm_statusRailTab'); await page.waitForTimeout(500) }
}
await openRail()
const rows = await page.evaluate(() => [...document.querySelectorAll('.tm_statusRailSlot')].map(el => {
  const r = el.querySelector('.tm_statusRailCard').getBoundingClientRect()
  return { title: el.querySelector('.tm_cardTitle')?.textContent?.trim(), x: Math.round(r.left + 40), y: Math.round(r.top + 30) }
}))
console.log('rail 行数:', rows.length, JSON.stringify(rows.slice(0,3).map(r => r.title)))
const target = rows[1]

// --- 单击：应打开对话（harness 记录 ui.openSession，并把地图关掉）
await page.evaluate(() => { window.__harness.log.length = 0 })
await page.mouse.move(target.x, target.y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up()
await page.waitForTimeout(600)
const afterClick = await page.evaluate(() => ({
  opened: window.__harness.log.filter(e => e.kind === 'ui.openSession').map(e => e.sessionId ?? e.data?.sessionId ?? null),
  railGone: document.querySelector('.tm_statusRail') === null,
}))
console.log('单击 → openSession:', JSON.stringify(afterClick))

// --- 双击：应留在地图并定位（选中 + 视口变化），不打开会话
await openMap(); await openRail()
const before = await page.evaluate(() => document.querySelector('.react-flow__viewport')?.style.transform ?? null)
await page.evaluate(() => { window.__harness.log.length = 0 })
const rows2 = await page.evaluate(() => [...document.querySelectorAll('.tm_statusRailSlot')].map(el => {
  const r = el.querySelector('.tm_statusRailCard').getBoundingClientRect()
  return { x: Math.round(r.left + 40), y: Math.round(r.top + 30) }
}))
await page.mouse.move(rows2[1].x, rows2[1].y)
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(90)
await page.mouse.down(); await page.mouse.up()
await page.waitForTimeout(500)
const afterDouble = await page.evaluate(() => ({
  opened: window.__harness.log.filter(e => e.kind === 'ui.openSession').length,
  selected: [...document.querySelectorAll('.react-flow__node.selected')].map(n => n.getAttribute('data-id')),
  transform: document.querySelector('.react-flow__viewport')?.style.transform ?? null,
  railGone: document.querySelector('.tm_statusRail') === null,
}))
console.log('双击 → ', JSON.stringify({ openedCount: afterDouble.opened, selected: afterDouble.selected, viewportChanged: before !== afterDouble.transform, railGone: afterDouble.railGone }))
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
