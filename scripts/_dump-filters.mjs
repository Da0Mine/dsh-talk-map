import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10008
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'dump-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','0'))
await page.reload(); await page.waitForTimeout(2400)
const info = await page.evaluate(() => {
  const out = []
  for (const svg of document.querySelectorAll('svg')) {
    const f = svg.querySelector('filter')
    if (f === null) continue
    const img = f.querySelector('feImage')
    const dm = f.querySelector('feDisplacementMap')
    out.push({
      filterId: f.id,
      attrs: { x: f.getAttribute('x'), y: f.getAttribute('y'), w: f.getAttribute('width'), h: f.getAttribute('height') },
      feImage: img === null ? null : { hrefLen: (img.getAttribute('href') ?? '').length, w: img.getAttribute('width'), h: img.getAttribute('height'), hrefHead: (img.getAttribute('href') ?? '').slice(0, 32) },
      displacement: dm === null ? null : { scale: dm.getAttribute('scale'), xCh: dm.getAttribute('xChannelSelector') },
      childCount: f.children.length,
    })
  }
  return out
})
console.log(JSON.stringify(info, null, 1))
await page.close(); await browser.close(); child.kill()
