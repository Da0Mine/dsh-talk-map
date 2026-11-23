import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9971
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'hdr-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(3000)
const info = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(node => /(^|_)header(_|$)/.test(node.className) && !node.className.includes('statusRail'))
  if (el === undefined) return { found: false }
  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return { found: true, className: el.className, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    backdrop: cs.backdropFilter, background: cs.backgroundColor, position: cs.position, zIndex: cs.zIndex }
})
console.log(JSON.stringify(info, null, 1))
if (info.found) {
  const box = { x: Math.max(0, info.rect.x), y: Math.max(0, info.rect.y), width: Math.min(info.rect.w, 1000), height: Math.max(40, info.rect.h) }
  await page.screenshot({ path: 'test/shots/header-only.png', clip: box })
  console.log('header 截图', JSON.stringify(box))
}
await page.close(); await browser.close(); child.kill()
