import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9998
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'tab-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
// 先把侧栏关掉，测关闭态的把手
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','0'))
await page.reload(); await page.waitForTimeout(2600)
const info = await page.evaluate(() => {
  const tab = document.querySelector('[class*="statusRailTab"]')
  const cs = tab === null ? null : getComputedStyle(tab)
  const r = tab?.getBoundingClientRect()
  return { tabFilter: cs?.backdropFilter, tabRadius: cs?.borderRadius, tabBg: cs?.backgroundColor, rect: r ? {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} : null }
})
console.log(JSON.stringify(info))
if (info.rect) {
  const clip = { x: Math.max(0, info.rect.x - 60), y: Math.max(0, info.rect.y - 40), width: 220, height: 180 }
  await page.screenshot({ path: 'test/shots/tab-closed.png', clip })
  console.log('把手截图', JSON.stringify(clip))
}
await page.close(); await browser.close(); child.kill()
