import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9641
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'both-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2500)
await page.click('button.tm_statusRailTab')
await page.waitForTimeout(500)
const rows = await page.evaluate(() => [...document.querySelectorAll('.tm_statusRailSlot')].map(el => {
  const r = el.querySelector('.tm_statusRailCard').getBoundingClientRect()
  return { title: el.querySelector('.tm_cardTitle')?.textContent?.trim(), x: Math.round(r.left + r.width/2), y: Math.round(r.top + 30), cy: Math.round(r.top + r.height/2) }
}))
const state = () => page.evaluate(() => [...document.querySelectorAll('.tm_statusRailSlot')].map(el => ({ t: el.querySelector('.tm_cardTitle')?.textContent?.trim(), shift: el.style.transform })))
// 向下拖：抓第1张，移到第3张
await page.mouse.move(rows[0].x, rows[0].y)
await page.mouse.down(); await page.waitForTimeout(120)
await page.mouse.move(rows[2].x, rows[2].cy + 20, { steps: 15 })
await page.waitForTimeout(250)
console.log('向下拖时:', JSON.stringify(await state()))
await page.mouse.up(); await page.waitForTimeout(400)
console.log('向下松手后:', JSON.stringify((await state()).map(r => r.t)))
// 向上拖：抓最后一张，移到第2张
const rows2 = await page.evaluate(() => [...document.querySelectorAll('.tm_statusRailSlot')].map(el => { const r = el.querySelector('.tm_statusRailCard').getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + 30), cy: Math.round(r.top + r.height/2) } }))
await page.mouse.move(rows2[3].x, rows2[3].y)
await page.mouse.down(); await page.waitForTimeout(120)
await page.mouse.move(rows2[1].x, rows2[1].cy, { steps: 15 })
await page.waitForTimeout(250)
console.log('向上拖时:', JSON.stringify(await state()))
await page.mouse.up(); await page.waitForTimeout(400)
console.log('向上松手后:', JSON.stringify((await state()).map(r => r.t)))
await browser.close(); child.kill()
