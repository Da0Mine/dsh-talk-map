import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9665
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'back3-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
// expand the sidebar so the footer action row is actually on screen
await page.evaluate(() => { window.__harness?.layout?.toggleSidebar?.({ collapsed: false }) })
await page.waitForTimeout(600)
const info = await page.evaluate(() => {
  const wrap = document.querySelector('[class*="toggleWrap"]')
  const back = document.querySelector('[class*="backToCurrent"]')
  const main = wrap?.querySelector('button')
  const r = el => el === null || el === undefined ? null : (() => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } })()
  return { sidebar: window.__harness?.sidebarState?.() ?? null, wrap: r(wrap), main: r(main), back: r(back), backRightOfMain: (r(back)?.x ?? 0) > (r(main)?.x ?? 0) }
})
console.log(JSON.stringify(info))
await page.screenshot({ path: 'test/shots/sidebar-wide.png' })
await browser.close(); child.kill()
