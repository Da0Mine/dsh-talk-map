import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10021
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'empty2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
// 清空卡片 + 清掉"已展开"记录，验证默认展开
await page.evaluate(() => {
  localStorage.setItem('dsh-talk-map.demo-state.v1', JSON.stringify({ cards: {}, edges: {}, digests: {}, global: {} }))
  localStorage.removeItem('dsh.talk-map.status-rail.open.v1')
})
await page.reload(); await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const rail = document.querySelector('[class*="statusRail"]')
  const railCls = rail === null ? null : rail.className
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const empty = [...document.querySelectorAll('div')].find(d => (d.className ?? '').includes('statusRailEmpty'))
  const tab = document.querySelector('[class*="statusRailTab"]')
  return {
    dataOpen: rail?.getAttribute('data-open') ?? null,
    panelX: panel === null ? null : Math.round(panel.getBoundingClientRect().x),
    emptyText: empty?.textContent ?? null,
    tabBorder: tab === null ? null : getComputedStyle(tab).borderRightWidth,
    tabWidth: tab === null ? null : Math.round(tab.getBoundingClientRect().width),
    railClsHead: (railCls ?? '').slice(0, 40),
  }
})
console.log(JSON.stringify(info, null, 1))
await page.screenshot({ path: 'test/shots/rail-empty-default.png', clip: { x: 30, y: 40, width: 520, height: 760 } })
await page.close(); await browser.close(); child.kill()
