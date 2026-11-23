import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10013
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'unit-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=900,700','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(2200)
const info = await page.evaluate(() => {
  // 条纹背景
  document.body.insertAdjacentHTML('beforeend', `
    <div style="position:fixed;left:20px;top:20px;width:200px;height:100px;z-index:9998;background:repeating-linear-gradient(90deg,#ff0 0 14px,#00f 14px 28px)"></div>
    <div id="a" style="position:fixed;left:20px;top:20px;width:200px;height:100px;z-index:9999;backdrop-filter:url(#orig)"></div>
    <div id="b" style="position:fixed;left:20px;top:140px;width:200px;height:100px;z-index:9999;backdrop-filter:url(#fixed)"></div>
    <div style="position:fixed;left:20px;top:140px;width:200px;height:100px;z-index:9998;background:repeating-linear-gradient(90deg,#ff0 0 14px,#00f 14px 28px)"></div>
  `)
  // 用我们自己的滤镜：原样一份（orig），再克隆并把区域改成 userSpaceOnUse（fixed）
  const src = document.querySelector('filter')
  const orig = src.cloneNode(true); orig.id = 'orig'
  const fixed = src.cloneNode(true); fixed.id = 'fixed'
  fixed.setAttribute('filterUnits','userSpaceOnUse')
  fixed.setAttribute('x','0'); fixed.setAttribute('y','0')
  fixed.setAttribute('width','200'); fixed.setAttribute('height','100')
  for (const img of fixed.querySelectorAll('feImage')) { img.setAttribute('width','200'); img.setAttribute('height','100') }
  const defs = src.parentElement
  defs.append(orig, fixed)
  return {
    origId: orig.id, fixedId: fixed.id,
    origAttrs: [orig.getAttribute('filterUnits'), orig.getAttribute('x'), orig.getAttribute('width')],
    fixedAttrs: [fixed.getAttribute('filterUnits'), fixed.getAttribute('x'), fixed.getAttribute('width')],
  }
})
console.log(JSON.stringify(info))
await page.waitForTimeout(500)
await page.screenshot({ path: 'test/shots/units-ab.png' })
await page.close(); await browser.close(); child.kill()
