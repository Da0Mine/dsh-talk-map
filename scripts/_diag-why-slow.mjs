import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9993
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'why-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1600,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1000)
await page.evaluate(() => {
  const key='dsh-talk-map.demo-state.v1'; const saved=JSON.parse(localStorage.getItem(key)??'null')??{cards:{},edges:{},digests:{},global:{}}
  const cards=saved.cards??{}
  for (let i=0;i<200;i+=1) cards[`b-${i}`]={boardId:'inbox',sessionId:`bs-${i}`,x:(i%20)*300,y:Math.floor(i/20)*260,createdAt:Date.now()}
  saved.cards=cards; localStorage.setItem(key, JSON.stringify(saved)); localStorage.setItem('dsh.talk-map.status-rail.open.v1','1')
})
await page.reload(); await page.waitForFunction(() => window.__harness !== undefined, { timeout: 60000 })
await page.waitForTimeout(4000)
const pan = async (label) => {
  await page.evaluate(() => { window.__f=[]; window.__on=true; let last=performance.now(); const tick=()=>{const n=performance.now(); window.__f.push(n-last); last=n; if(window.__on) requestAnimationFrame(tick)}; requestAnimationFrame(tick) })
  await page.mouse.move(900,500); await page.mouse.down({button:'middle'})
  const mid = []
  for (let i=1;i<=30;i+=1){ await page.mouse.move(900+i*7,500+i*3); await page.waitForTimeout(16); if (i===15) mid.push(await page.evaluate(() => ({ frozen: document.querySelector('[class*="statusRail"][data-open]')?.getAttribute('data-frozen'), filter: getComputedStyle(document.querySelector('[class*="statusRailPanel"]')).backdropFilter }))) }
  await page.mouse.up({button:'middle'})
  const stats = await page.evaluate(() => { window.__on=false; const s=[...window.__f].sort((a,b)=>a-b); const q=p=>Math.round(s[Math.floor(s.length*p)]??0); return {median:q(.5),p95:q(.95)} })
  console.log(label, JSON.stringify(stats), 'midpan=', JSON.stringify(mid))
  await page.waitForTimeout(300)
}
await pan('normal(frozen active)')
await page.evaluate(() => { const s=document.createElement('style'); s.id='kill'; s.textContent='[class*="statusRailPanel"],[class*="statusRailTab"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'; document.head.append(s) })
await pan('injected none')
await page.evaluate(() => document.getElementById('kill')?.remove())
await page.evaluate(() => document.getElementById('dsh-talk-map-liquid-glass-svg')?.remove())
await pan('svg removed')
await page.close(); await browser.close(); child.kill()
