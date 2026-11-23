import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9961
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'r2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1500,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => localStorage.setItem('dsh.talk-map.status-rail.open.v1','1'))
await page.reload(); await page.waitForTimeout(3200)
// 彩色背板
await page.evaluate(() => {
  const layer=document.createElement('div')
  layer.style.cssText='position:fixed;left:0;top:0;width:560px;height:100vh;z-index:5;pointer-events:none;background:radial-gradient(60% 40% at 20% 20%, #4a7cff 0%, transparent 60%),radial-gradient(50% 40% at 80% 55%, #ff5fa2 0%, transparent 60%),radial-gradient(60% 50% at 40% 92%, #22d3a7 0%, transparent 60%),#0b0d12;'
  document.body.append(layer)
})
await page.waitForTimeout(500)
const cards = await page.evaluate(() => [...document.querySelectorAll('[data-glass-card]')].map(el => el.getBoundingClientRect()).map(r => ({x:r.x+r.width/2,y:r.y+r.height/2})))
console.log('卡片数:', cards.length, '| 有 data-liquid-glow 的卡片:', await page.evaluate(() => document.querySelectorAll('[data-glass-card][data-liquid-glow]').length))
// 悬停第 2 张卡触发光效
if (cards[1]) { await page.mouse.move(cards[1].x - 30, cards[1].y - 10); await page.waitForTimeout(400) }
const box = await page.evaluate(() => {
  const r=document.querySelector('[class*="statusRailPanel"]').getBoundingClientRect()
  return { x: Math.max(0,r.x), y: Math.max(0,r.y), width: Math.min(r.width+200,470), height: Math.min(r.height,700) }
})
await page.screenshot({ path: 'test/shots/round2-rail.png', clip: box })
// 顶部条
const hbox = await page.evaluate(() => { const r=document.querySelector('[class*="header"]').getBoundingClientRect(); return { x:Math.max(0,r.x), y:Math.max(0,r.y), width:Math.min(r.width,900), height:Math.min(r.height+8,80) } })
const header = await page.evaluate(() => { const r=document.querySelector('[class*="header"]').getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 } })
await page.mouse.move(header.x, header.y)
await page.waitForTimeout(350)
await page.screenshot({ path: 'test/shots/round2-header.png', clip: hbox })
console.log('截图完成')
await page.close(); await browser.close(); child.kill()
