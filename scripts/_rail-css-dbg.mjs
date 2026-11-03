import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9603
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'dbg2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2500)
const info = await page.evaluate(() => {
  const root = document.querySelector('[class*="statusRail"]')
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const tab = document.querySelector('[class*="statusRailTab"]')
  const cs = el => el === null ? null : getComputedStyle(el)
  return {
    rootClass: root?.className,
    rootPointer: cs(root)?.pointerEvents,
    vars: {
      cardW: cs(root)?.getPropertyValue('--rail-card-w').trim(),
      outer: cs(root)?.getPropertyValue('--rail-card-outer').trim(),
      railW: cs(root)?.getPropertyValue('--rail-w').trim(),
    },
    panelWidth: cs(panel)?.width,
    panelTransform: cs(panel)?.transform,
    tabPointer: cs(tab)?.pointerEvents,
    tabBg: cs(tab)?.backgroundColor,
    tabBackdrop: cs(tab)?.backdropFilter,
    tabZ: cs(tab)?.zIndex,
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close(); child.kill()
