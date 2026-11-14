import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9685
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'probe-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0,200)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
const snap = (label) => page.evaluate((l) => ({
  label: l,
  rail: document.querySelector('.tm_statusRail') !== null,
  tab: document.querySelector('button.tm_statusRailTab') !== null,
  panelEl: document.querySelector('[class*="tm_panel"]') !== null,
  canvas: document.querySelector('[class*="tm_canvas"]') !== null,
  toggles: document.querySelectorAll('[class*="toggleButton"]').length,
  bodyHasRailText: document.body.innerText.includes('队列中的任务'),
}), label)
console.log(JSON.stringify(await snap('load')))
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(700)
console.log(JSON.stringify(await snap('after Alt+F')))
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(500)
console.log(JSON.stringify(await snap('after Alt+F again')))
await browser.close(); child.kill()
