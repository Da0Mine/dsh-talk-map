import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9631
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'flip-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
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
  const card = el.querySelector('.tm_statusRailCard'); const r = card.getBoundingClientRect()
  return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + 30) }
}))
// start drag on the 3rd card, then hover the 1st and sample the 2nd card's transform over time
await page.mouse.move(rows[2].x, rows[2].y)
await page.mouse.down()
await page.waitForTimeout(120)
await page.mouse.move(rows[0].x, rows[0].y - 10, { steps: 20 })
const samples = []
for (const wait of [40, 100, 180, 260]) {
  await page.waitForTimeout(wait)
  samples.push(await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.tm_statusRailSlot')]
    return slots.map(el => ({
      shift: el.style.transform || '',
      inlineTransition: el.style.transition || '',
      y: Math.round(el.getBoundingClientRect().top),
    }))
  }))
}
console.log('顺序:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.tm_statusRailSlot .tm_cardTitle')].map(e => e.textContent?.trim()))))
console.log('采样(第2张):', JSON.stringify(samples.map(s => s[1])))
await page.mouse.up()
await browser.close(); child.kill()
