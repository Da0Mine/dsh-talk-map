import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = 8793, CDP = 10110
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'anim-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,950','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<25000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/test/index.html?run=${Date.now()}`)
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.evaluate(() => { const b=document.querySelector('[class*="tm_sidebarEntry"]'); if (b!==null) b.click() })
await page.waitForTimeout(2200)
const info = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  const running = [...document.querySelectorAll('[class*="statusRailCard"]')].find(c => /cardLampRunning/.test(c.className))
  const reticle = document.querySelector('[class*="cardReticle"]')
  return {
    scrollbarWidth: getComputedStyle(panel).scrollbarWidth,
    hasRunningCard: running !== undefined,
    runningAnimation: running === undefined ? null : getComputedStyle(running).animationName,
    ringAnimation: running === undefined ? null : getComputedStyle(running, '::after').animationName,
    reticleCount: document.querySelectorAll('[class*="cardReticle"]').length,
    reticleZ: reticle === null ? null : getComputedStyle(reticle).zIndex,
    recentHead: document.querySelector('[class*="statusRailRecentHead"]') !== null,
  }
})
console.log(JSON.stringify(info, null, 1))
// 呼吸灯：两帧对比
if (info.hasRunningCard) {
  const box = await page.evaluate(() => {
    const c = [...document.querySelectorAll('[class*="statusRailCard"]')].find(el => /cardLampRunning/.test(el.className))
    const r = c.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  })
  await page.screenshot({ path: 'test/shots/anim-a.png', clip: box })
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'test/shots/anim-b.png', clip: box })
  console.log('两帧已出', JSON.stringify(box))
}
await page.close(); await browser.close(); child.kill()
