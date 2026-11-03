import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9609
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'dbg5-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2500)
const info = await page.evaluate(() => {
  const roots = [...document.querySelectorAll('[class*="statusRail"]')].filter(el => el.className.includes('statusRail') && el.children.length > 0)
  const tabs = [...document.querySelectorAll('[class*="statusRailTab"]')]
  tabs.forEach(tab => tab.click())
  return {
    roots: roots.map(el => el.className),
    tabCount: tabs.length,
    panels: [...document.querySelectorAll('[class*="statusRailPanel"]')].length,
  }
})
console.log('点击前:', JSON.stringify(info))
await page.waitForTimeout(500)
const after = await page.evaluate(() => ({
  roots: [...document.querySelectorAll('[class*="statusRail"]')].map(el => el.className),
  transforms: [...document.querySelectorAll('[class*="statusRailPanel"]')].map(el => getComputedStyle(el).transform),
}))
console.log('点击后:', JSON.stringify(after))
await browser.close(); child.kill()
