import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10012
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'feimg2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=900,700','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(2000)
const setup = await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 8; c.height = 8
  const g = c.getContext('2d'); g.fillStyle = 'rgb(255,0,0)'; g.fillRect(0,0,8,8)
  const url = c.toDataURL()
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg')
  svg.setAttribute('width','0'); svg.setAttribute('height','0'); svg.style.position='absolute'
  svg.innerHTML = `<defs><filter id="redis" x="0" y="0" width="100%" height="100%">
    <feImage href="${url}" x="0" y="0" width="100" height="100" result="img"/>
  </filter></defs>`
  document.body.append(svg)
  document.body.insertAdjacentHTML('beforeend', `
    <div style="position:fixed;left:20px;top:20px;width:100px;height:100px;z-index:9998;background:#00ff00"></div>
    <div style="position:fixed;left:20px;top:20px;width:100px;height:100px;z-index:9999;backdrop-filter:url(#redis)"></div>
  `)
  return { urlLen: url.length, filterId: 'redis' }
})
console.log(JSON.stringify(setup))
await page.waitForTimeout(500)
await page.screenshot({ path: 'test/shots/feimage-app-probe.png', clip: { x: 0, y: 0, width: 160, height: 160 } })
await page.close(); await browser.close(); child.kill()
