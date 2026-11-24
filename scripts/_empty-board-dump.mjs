import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10022
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'empty3-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(1200)
await page.evaluate(() => {
  localStorage.setItem('dsh-talk-map.demo-state.v1', JSON.stringify({ cards: {}, edges: {}, digests: {}, global: {} }))
  localStorage.removeItem('dsh.talk-map.status-rail.open.v1')
})
await page.reload(); await page.waitForTimeout(2800)
const info = await page.evaluate(() => {
  const root = document.querySelector('#app') ?? document.body
  const classes = [...root.querySelectorAll('div')].slice(0, 12).map(d => (d.className ?? '').toString().slice(0, 60)).filter(Boolean)
  const bodyText = (document.body.innerText ?? '').slice(0, 200).replace(/\n+/g, ' | ')
  return { divCount: root.querySelectorAll('div').length, classes, bodyText }
})
console.log(JSON.stringify(info, null, 1).slice(0, 1400))
await page.screenshot({ path: 'test/shots/empty-board.png' })
await page.close(); await browser.close(); child.kill()
