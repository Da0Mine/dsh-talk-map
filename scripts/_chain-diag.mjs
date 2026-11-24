import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10042
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'chain-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(2400)
const chain = await page.evaluate(() => {
  const card = document.querySelector('[class*="statusRailCard"]')
  const out = []
  for (let el = card; el !== null && out.length < 12; el = el.parentElement) {
    const s = getComputedStyle(el)
    out.push({
      tag: el.tagName,
      cls: (el.className ?? '').toString().split(' ').slice(0, 2).join('.').slice(0, 34),
      isolation: s.isolation,
      filter: s.filter === 'none' ? '' : s.filter.slice(0, 24),
      bf: s.backdropFilter === 'none' ? '' : s.backdropFilter.slice(0, 24),
      transform: s.transform === 'none' ? '' : s.transform.slice(0, 20),
      contain: s.contain,
      contentVisibility: s.contentVisibility,
      opacity: s.opacity,
    })
  }
  return out.filter(x => x.isolation !== 'auto' || x.filter !== '' || x.bf !== '' || x.transform !== '' || x.contain !== 'none' || x.contentVisibility !== 'visible' || x.opacity !== '1')
})
console.log(JSON.stringify(chain, null, 1).slice(0, 1500))
await page.close(); await browser.close(); child.kill()
