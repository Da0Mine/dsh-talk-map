import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10020
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'empty-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
// 空队列 + 打开侧栏
await page.evaluate(() => {
  localStorage.setItem('dsh.talk-map.status-rail.open.v1','1')
  const key='dsh-talk-map.demo-state.v1'
  const saved=JSON.parse(localStorage.getItem(key)??'null')??{cards:{},edges:{},digests:{},global:{}}
  saved.cards = saved.cards ?? {}
  localStorage.setItem(key, JSON.stringify(saved))
})
await page.reload(); await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const rail = document.querySelector('[class*="statusRail"]')
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const empty = document.querySelector('[class*="statusRailEmpty"]')
  const cs = panel === null ? null : getComputedStyle(panel)
  return {
    railExists: rail !== null,
    dataOpen: rail?.getAttribute('data-open') ?? null,
    panelExists: panel !== null,
    panelTransform: cs?.transform ?? null,
    panelWidth: panel === null ? null : Math.round(panel.getBoundingClientRect().width),
    emptyText: empty === null ? null : (empty.textContent ?? '').slice(0, 40),
    emptyVisible: empty === null ? null : getComputedStyle(empty).display,
  }
})
console.log(JSON.stringify(info, null, 1))
await page.screenshot({ path: 'test/shots/rail-empty.png', clip: { x: 40, y: 50, width: 460, height: 700 } })
await page.close(); await browser.close(); child.kill()
