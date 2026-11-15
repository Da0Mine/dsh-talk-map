import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9701
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'noCur-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,160)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
await page.evaluate(() => localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 's13' })))
await page.reload(); await page.waitForTimeout(2600)
if (await page.evaluate(() => document.querySelector('.tm_statusRail')?.getAttribute('data-open')) !== '1') {
  await page.click('button.tm_statusRailTab'); await page.waitForTimeout(600)
}
const info = await page.evaluate(() => {
  const panel = document.querySelector('[class*="statusRailPanel"]')
  return {
    children: [...(panel?.children ?? [])].map(el => (el.className || '').split(' ').filter(c => c.includes('statusRail')).join('.')),
    headText: panel?.querySelector('[class*="statusRailHead"]')?.innerText?.replace(/\s+/g, ' ').slice(0, 20),
    hasCurrentBlock: document.querySelector('[data-talkmap-current]') !== null,
  }
})
console.log(JSON.stringify(info))
await page.screenshot({ path: 'test/shots/rail-no-current.png', clip: { x: 0, y: 0, width: 420, height: 640 } })
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
