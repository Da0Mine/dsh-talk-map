import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9651
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'jump2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2500)
await page.click('button.tm_statusRailTab')
await page.waitForTimeout(500)
const before = await page.evaluate(() => { const c = document.querySelectorAll('.tm_statusRailCard')[1].getBoundingClientRect(); return { top: Math.round(c.top), left: Math.round(c.left) } })
await page.mouse.move(before.left + 80, before.top + 30)
await page.mouse.down(); await page.waitForTimeout(120)
const after = await page.evaluate(() => { const f = document.querySelector('.tm_statusRailFloating .tm_statusRailCard'); if (f === null) return null; const r = f.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left) } })
console.log('按下前:', JSON.stringify(before), ' 浮动副本:', JSON.stringify(after), ' 位移=', after === null ? 'n/a' : (after.top - before.top))
await page.mouse.move(before.left + 80, before.top - 60, { steps: 10 })
const moved = await page.evaluate(() => { const f = document.querySelector('.tm_statusRailFloating .tm_statusRailCard'); const r = f.getBoundingClientRect(); return Math.round(r.top) })
console.log('上移 60px 后浮动副本 top:', moved, '（应为', before.top - 60, '左右）')
await page.mouse.up()
await browser.close(); child.kill()
