import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9693
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'cur2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
const probe = await page.evaluate(() => {
  const ls = {}
  for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); ls[k] = (localStorage.getItem(k) ?? '').slice(0, 60) }
  return {
    currentKey: localStorage.getItem('dsh.sessions.current'),
    convKeys: Object.keys(ls).filter(k => k.startsWith('dsh.conversation.')).slice(0, 3),
    harnessKeys: Object.keys(window.__harness ?? {}),
    sample: Object.entries(ls).filter(([k]) => k.includes('sessions')).slice(0, 5),
  }
})
console.log(JSON.stringify(probe, null, 1))
await browser.close(); child.kill()
