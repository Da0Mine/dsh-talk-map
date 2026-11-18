import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9781
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'readmark-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1400,height:900})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,160)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(900)
const before = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => el.getAttribute('data-talkmap-queue')))
// 把 s3 标记成主视图（retainedBy.mainView>0）＝“已读”
await page.evaluate(() => {
  const h = window.__harness
  const st = h.sessionsState ? h.sessionsState() : null
  return null
})
const setMain = await page.evaluate(() => {
  // harness 的 sessionsState 是模块内的；通过它的 byId 直接改
  const list = window.__harness.sessionsState?.()
  return list === undefined || list === null ? 'no accessor' : Object.keys(list.byId).slice(0, 3)
})
// 用侧栏队列里 s3 的卡片：先点一下（会 forget），再看它是否立刻消失
await page.evaluate(() => { window.__harness.log.length = 0 })
await page.click('[data-talkmap-queue="s3"]')
await page.waitForTimeout(600)
const afterClick = await page.evaluate(() => ({
  ids: [...document.querySelectorAll('[data-talkmap-queue]')].map(el => el.getAttribute('data-talkmap-queue')),
  opened: window.__harness.log.filter(e => e.kind === 'ui.openSession').length,
  finishedCleared: window.__harness.finished?.() ?? null,
}))
console.log('点击前:', JSON.stringify(before))
console.log('点击 s3 后:', JSON.stringify(afterClick))
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
