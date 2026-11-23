import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 10006
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'svgbd-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=800,600','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
const result = await page.evaluate(() => {
  document.body.style.margin='0'
  document.body.innerHTML = `
    <div id="bg" style="position:fixed;inset:0;background:linear-gradient(90deg,#ff0000 0 50%,#0000ff 50% 100%)"></div>
    <svg width="0" height="0" style="position:absolute"><defs>
      <filter id="invert" x="0" y="0" width="100%" height="100%">
        <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/>
      </filter>
    </defs></svg>
    <div id="glass" style="position:fixed;left:100px;top:100px;width:200px;height:100px;backdrop-filter:url(#invert);-webkit-backdrop-filter:url(#invert)"></div>
    <div id="ref" style="position:fixed;left:100px;top:250px;width:200px;height:100px;filter:url(#invert)"></div>
  `
  const supports = CSS.supports('backdrop-filter', 'url(#invert)')
  return { supports, note: 'screenshot 会显示左下角是否被反色' }
})
console.log(JSON.stringify(result))
await page.screenshot({ path: 'test/shots/svg-backdrop-test.png' })
await page.close(); await browser.close(); child.kill()
