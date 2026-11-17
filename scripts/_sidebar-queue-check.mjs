import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9721
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'sq-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,200)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(3000)
// demo 启动时地图是打开的（侧栏被收成 rail）；关掉地图侧栏才会展开成 wide
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(900)
const before = await page.evaluate(() => ({
  collapsed: window.__harness.sidebarState().collapsed,
  items: document.querySelectorAll('[class*="sidebarQueueItem"]').length,
}))
const info = await page.evaluate(() => {
  const root = document.querySelector('[class*="sidebarQueue"]')
  const items = [...document.querySelectorAll('[class*="sidebarQueueItem"]')]
  return {
    wide: window.__harness?.sidebarState?.() ?? null,
    hasQueue: root !== null,
    head: root?.querySelector('[class*="sidebarQueueHead"]')?.innerText?.replace(/\s+/g, ' ') ?? null,
    items: items.map(el => el.getAttribute('data-talkmap-queue')),
    titles: items.map(el => el.querySelector('[class*="sidebarQueueTitle"]')?.textContent?.trim()),
  }
})
console.log('展开前队列条数:', before)
console.log(JSON.stringify(info, null, 1))
if (info.items.length > 0) {
  await page.evaluate(() => { window.__harness.log.length = 0 })
  await page.click('[class*="sidebarQueueItem"]')
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => ({
    opened: window.__harness.log.filter(e => e.kind === 'ui.openSession').length,
    session: window.__harness.log.filter(e => e.kind === 'ui.openSession').at(-1)?.sessionId ?? null,
  }))
  console.log('点击后:', JSON.stringify(after))
}
const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : 'test/shots/sidebar-queue.png'
await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 260, height: 760 } })
console.log('shot:', shot)
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
