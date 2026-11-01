import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p))
const profile = path.join(os.tmpdir(), 'sim-debug-' + Date.now())
const child = spawn(EDGE, ['--remote-debugging-port=9399', `--user-data-dir=${profile}`,'--no-first-run','--disable-extensions','--headless=new','about:blank'], {stdio:'ignore'})
let ready=false; const t0=Date.now(); while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch('http://127.0.0.1:9399/json/version')).ok }catch{} if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser = await chromium.connectOverCDP('http://127.0.0.1:9399')
const page = browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
const logs=[]; page.on('console',m=>logs.push(m.type()+': '+m.text().slice(0,200))); page.on('pageerror',e=>logs.push('EXC: '+String(e).slice(0,300)))
await page.goto('file:///' + path.resolve('test/shots/board-sim.html').replace(/\\/g,'/'))
await page.waitForTimeout(1500)
console.log('html length', (await page.evaluate(()=>document.body.innerHTML.length)))
console.log('nodes', await page.evaluate(()=>document.querySelectorAll('.react-flow__node').length))
console.log('logs', JSON.stringify(logs.slice(0,4)))
await browser.close(); child.kill()
