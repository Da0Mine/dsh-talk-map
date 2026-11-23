import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10010
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'ns-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','0'))
await page.reload(); await page.waitForTimeout(2400)
const info = await page.evaluate(() => {
  const filters = [...document.querySelectorAll('filter')]
  return filters.map(f => ({
    id: f.id,
    ns: f.namespaceURI,
    units: f.getAttribute('filterUnits'),
    rect: [f.getAttribute('x'), f.getAttribute('y'), f.getAttribute('width'), f.getAttribute('height')],
    children: [...f.children].map(c => ({ tag: c.tagName, ns: c.namespaceURI })),
  }))
})
console.log(JSON.stringify(info, null, 1))
await page.close(); await browser.close(); child.kill()
