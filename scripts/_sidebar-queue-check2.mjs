import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9731
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'sq2-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1400,height:900})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,200)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1000)
const info = await page.evaluate(() => {
  const box = document.querySelector('[data-harness-sidebar]')
  const root = document.querySelector('[data-talkmap-queue-root]')
  const list = root?.querySelector('[class*="sidebarQueueList"]')
  const cards = [...document.querySelectorAll('[data-talkmap-queue]')]
  const mapBtn = document.querySelector('[class*="toggleRow"]') ?? document.querySelector('[class*="toggleButton"]')
  const backBtn = document.querySelector('[data-talkmap-back]')
  const r = el => el === null ? null : (b => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }))(el.getBoundingClientRect())
  return {
    sidebar: r(box),
    queueRoot: r(root),
    listScroll: list === null ? null : { clientH: Math.round(list.clientHeight), scrollH: Math.round(list.scrollHeight), scrollable: list.scrollHeight > list.clientHeight + 2 },
    cardCount: cards.length,
    firstCard: cards[0] === undefined ? null : { title: cards[0].querySelector('[class*="cardTitle"]')?.textContent?.trim(), rect: r(cards[0]) },
    mapButton: r(mapBtn),
    backButton: r(backBtn),
    buttonsVisible: mapBtn !== null && backBtn !== null
      && mapBtn.getBoundingClientRect().bottom <= window.innerHeight
      && backBtn.getBoundingClientRect().bottom <= window.innerHeight,
  }
})
console.log(JSON.stringify(info, null, 1))
if (info.cardCount > 0) {
  await page.evaluate(() => { window.__harness.log.length = 0 })
  await page.click('[data-talkmap-queue]')
  await page.waitForTimeout(600)
  const after = await page.evaluate(() => ({
    opened: window.__harness.log.filter(e => e.kind === 'ui.openSession').length,
    session: window.__harness.log.filter(e => e.kind === 'ui.openSession').at(-1)?.sessionId ?? null,
    mapClosed: window.__harness.panelState?.().open ?? null,
  }))
  console.log('点击侧栏卡片:', JSON.stringify(after))
}
await page.screenshot({ path: 'test/shots/sidebar-queue2.png', clip: { x: 0, y: 0, width: 250, height: 900 } })
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
