import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9621
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'jump-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2500)
await page.click('button.tm_statusRailTab')
await page.waitForTimeout(500)
const before = await page.evaluate(() => {
  const card = document.querySelectorAll('.tm_statusRailCard')[1]
  const r = card.getBoundingClientRect()
  return { top: Math.round(r.top), left: Math.round(r.left), h: Math.round(r.height) }
})
console.log('按下前卡片:', JSON.stringify(before))
await page.mouse.move(before.left + 80, before.top + 30)
await page.mouse.down()
await page.waitForTimeout(120)
const after = await page.evaluate(() => {
  const slots = [...document.querySelectorAll('.tm_statusRailSlot')]
  const floating = slots.find(el => el.className.includes('Floating'))
  const card = floating?.querySelector('.tm_statusRailCard')
  const r = card?.getBoundingClientRect()
  return { slotTop: floating ? Math.round(floating.getBoundingClientRect().top) : null, cardTop: r ? Math.round(r.top) : null, slotStyleTop: floating?.style.top ?? null, inline: floating?.getAttribute('style')?.slice(0,120) ?? null }
})
console.log('按下后:', JSON.stringify(after))
await browser.close(); child.kill()
