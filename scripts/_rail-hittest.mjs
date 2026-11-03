import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9605
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'dbg3-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2500)
const probe = await page.evaluate(() => {
  const tab = document.querySelector('[class*="statusRailTab"]')
  const r = tab.getBoundingClientRect()
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return { tabRect: { x: r.left, y: r.top, w: r.width, h: r.height }, hitTag: hit?.tagName, hitClass: hit?.getAttribute('class'), isTab: hit === tab || tab.contains(hit) }
})
console.log('hit test:', JSON.stringify(probe))
const openedByJs = await page.evaluate(() => {
  const tab = document.querySelector('[class*="statusRailTab"]')
  tab.click()
  return document.querySelector('[class*="statusRail"]').className
})
console.log('JS click 后:', openedByJs)
await page.waitForTimeout(500)
const afterJs = await page.evaluate(() => ({
  cls: document.querySelector('[class*="statusRail"]').className,
  transform: getComputedStyle(document.querySelector('[class*="statusRailPanel"]')).transform,
}))
console.log('JS click 之后状态:', JSON.stringify(afterJs))
await browser.close(); child.kill()
