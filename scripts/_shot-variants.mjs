import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9931
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'variants-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(3000)

const variants = {
  A: '', // 当前实现
  B: `
    [class*="statusRailPanel"]{
      background:
        linear-gradient(165deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.07) 40%, rgba(255,255,255,.14) 100%),
        color-mix(in oklab, var(--dsw-alias-bg-elevated,#14161c) 20%, transparent) !important;
      backdrop-filter: blur(10px) saturate(240%) brightness(1.14) !important;
      border-right: 1.5px solid rgba(255,255,255,.42) !important;
      box-shadow: 8px 0 34px rgba(0,0,0,.3), 0 0 60px rgba(255,255,255,.07),
        inset 0 2px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(255,255,255,.12),
        inset 0 30px 50px -40px rgba(255,255,255,.35) !important;
    }
    [class*="statusRailPanel"] .card{
      background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.03) 48%),
        color-mix(in oklab, var(--dsw-alias-bg-layer-1,#1b1e26) 30%, transparent) !important;
      border-color: rgba(255,255,255,.22) !important;
      box-shadow: 0 3px 14px rgba(0,0,0,.24), inset 0 1.5px 0 rgba(255,255,255,.5),
        inset 0 0 0 1px rgba(255,255,255,.10) !important;
    }`,
  C: `
    [class*="statusRailPanel"]{
      background:
        linear-gradient(160deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.02) 30%, rgba(255,255,255,.08) 100%),
        color-mix(in oklab, var(--dsw-alias-bg-elevated,#14161c) 42%, transparent) !important;
      backdrop-filter: blur(3px) saturate(190%) !important;
      border-right: 2px solid rgba(255,255,255,.30) !important;
      box-shadow: 10px 0 40px rgba(0,0,0,.34),
        inset 0 0 30px rgba(0,0,0,.30),
        inset 0 2px 0 rgba(255,255,255,.45) !important;
    }
    [class*="statusRailPanel"] .card{
      background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.02) 44%),
        color-mix(in oklab, var(--dsw-alias-bg-layer-1,#1b1e26) 52%, transparent) !important;
      border-color: rgba(255,255,255,.18) !important;
      box-shadow: 0 2px 10px rgba(0,0,0,.26), inset 0 1.5px 0 rgba(255,255,255,.46),
        inset 0 0 0 1px rgba(255,255,255,.07), inset 0 0 20px rgba(0,0,0,.18) !important;
    }`,
}
const setVariant = async (css) => page.evaluate((text) => {
  const id = 'variant-style'
  document.getElementById(id)?.remove()
  if (text.trim() === '') return
  const style = document.createElement('style')
  style.id = id
  style.textContent = text
  document.head.append(style)
}, css)

for (const [name, css] of Object.entries(variants)) {
  await setVariant(css)
  await page.waitForTimeout(500)
  const box = await page.evaluate(() => {
    const el = document.querySelector('[class*="statusRailPanel"]')
    const r = el.getBoundingClientRect()
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width + 210, 470), height: Math.min(r.height, 700) }
  })
  await page.screenshot({ path: `test/shots/variant-${name}.png`, clip: box })
  console.log('变体', name, '已截图')
}
await page.close(); await browser.close(); child.kill()
