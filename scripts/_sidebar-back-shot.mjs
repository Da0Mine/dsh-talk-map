import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9661
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'back-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const wrap = document.querySelector('[class*="toggleWrap"]')
  const back = document.querySelector('[class*="backToCurrent"]')
  const main = wrap === null ? null : wrap.querySelector('button')
  const r = el => el === null ? null : { x: Math.round(el.getBoundingClientRect().left), y: Math.round(el.getBoundingClientRect().top), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }
  return { wrap: r(wrap), main: r(main), back: r(back), backTitle: back?.getAttribute('title') ?? null, hasCrosshair: back === null ? false : back.querySelector('svg') !== null }
})
console.log(JSON.stringify(info, null, 1))
const shot = await page.screenshot({ clip: { x: 0, y: (info.wrap?.y ?? 900) - 40, width: 260, height: 120 } })
fs.writeFileSync('test/shots/sidebar-back-button.png', shot)
await browser.close(); child.kill()
