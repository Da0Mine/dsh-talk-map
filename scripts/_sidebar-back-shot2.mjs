import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9663
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'back2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
const box = await page.evaluate(() => {
  const back = document.querySelector('[class*="backToCurrent"]')
  const wrap = document.querySelector('[class*="toggleWrap"]')
  const r = back.getBoundingClientRect()
  const w = wrap.getBoundingClientRect()
  const cs = getComputedStyle(back)
  return { back: { x: r.left, y: r.top, w: r.width, h: r.height }, wrap: { x: w.left, y: w.top, w: w.width, h: w.height }, color: cs.color, opacity: cs.opacity, display: cs.display, bg: cs.backgroundColor }
})
console.log(JSON.stringify(box))
await page.screenshot({ path: 'test/shots/sidebar-back-full.png' })
await browser.close(); child.kill()
