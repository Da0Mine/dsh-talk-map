import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9561
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'gl-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:700,height:140})
await page.goto('file:///'+path.resolve('test/shots/arrow-glyph.html').replace(/\\/g,'/'))
await page.waitForTimeout(300)
await page.screenshot({ path: 'test/shots/arrow-glyph.png' })
await browser.close(); child.kill()
console.log('saved')
