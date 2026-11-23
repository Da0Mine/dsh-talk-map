import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10007
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'feimg-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=800,600','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.evaluate(() => {
  // 造一张"整体向右偏移 40px"的位移贴图（R=128+40/scale*... 这里直接用 R=255/G=128 制造最大位移）
  const c = document.createElement('canvas')
  c.width = 200; c.height = 100
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgb(255,128,0)'
  ctx.fillRect(0, 0, 200, 100)
  const url = c.toDataURL()
  document.body.style.margin = '0'
  document.body.innerHTML = `
    <div id="bg" style="position:fixed;inset:0;background:repeating-linear-gradient(90deg,#fff 0 12px,#000 12px 24px)"></div>
    <svg width="0" height="0" style="position:absolute"><defs>
      <filter id="disp" filterUnits="userSpaceOnUse" x="0" y="0" width="200" height="100" color-interpolation-filters="sRGB">
        <feImage href="${url}" x="0" y="0" width="200" height="100" result="map"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs></svg>
    <div style="position:fixed;left:100px;top:100px;width:200px;height:100px;backdrop-filter:url(#disp)"></div>
    <div id="plain" style="position:fixed;left:100px;top:300px;width:200px;height:100px"></div>
  `
})
await page.waitForTimeout(400)
await page.screenshot({ path: 'test/shots/feimage-test.png' })
console.log('feImage + feDisplacementMap 测试图已出')
await page.close(); await browser.close(); child.kill()
