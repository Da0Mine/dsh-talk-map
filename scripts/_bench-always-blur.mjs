import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9951
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'always-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1600,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => {
  const key='dsh-talk-map.demo-state.v1'
  const saved=JSON.parse(localStorage.getItem(key) ?? 'null') ?? {cards:{},edges:{},digests:{},global:{}}
  const cards=saved.cards ?? {}
  for (let i=0;i<800;i+=1) cards[`b-${i}`]={boardId:'inbox',sessionId:`bs-${i}`,x:(i%20)*300,y:Math.floor(i/20)*260,createdAt:Date.now()}
  saved.cards=cards
  localStorage.setItem(key, JSON.stringify(saved))
  localStorage.setItem('dsh.talk-map.status-rail.open.v1','1')
})
await page.reload()
await page.waitForFunction(() => window.__harness !== undefined, { timeout: 60000 })
await page.waitForTimeout(4000)
// 强制拖动时也不关模糊（测试"始终模糊"的代价）
await page.evaluate(() => {
  const s=document.createElement('style')
  s.textContent='[class*="statusRail"][data-frozen="1"] [class*="statusRailPanel"]{backdrop-filter:blur(3px) saturate(180%) brightness(1.02) !important;-webkit-backdrop-filter:blur(3px) saturate(180%) brightness(1.02) !important;}'
  document.head.append(s)
})
const pan = async () => {
  await page.evaluate(() => { window.__f=[]; window.__on=true; let last=performance.now(); const tick=()=>{const now=performance.now(); window.__f.push(now-last); last=now; if(window.__on) requestAnimationFrame(tick)}; requestAnimationFrame(tick) })
  await page.mouse.move(900,500); await page.mouse.down({button:'middle'})
  for (let i=1;i<=30;i+=1){ await page.mouse.move(900+i*7,500+i*3); await page.waitForTimeout(16) }
  await page.mouse.up({button:'middle'})
  return page.evaluate(() => { window.__on=false; const s=[...window.__f].sort((a,b)=>a-b); const q=p=>Math.round(s[Math.floor(s.length*p)]??0); return {median:q(.5),p95:q(.95),worst:Math.round(s[s.length-1]??0)} })
}
await pan() // 预热
await page.waitForTimeout(300)
const runs = []
for (let i=0;i<2;i+=1) { runs.push(await pan()); await page.waitForTimeout(250) }
console.log('始终模糊（拖动也不关）:', JSON.stringify(runs))
await page.close(); await browser.close(); child.kill()
