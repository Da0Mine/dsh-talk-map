import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9691
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'cur-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,160)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
// demo 不写 dsh.sessions.current：手动标一个，模拟"从某个会话打开地图"
await page.evaluate(() => { localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 's13' })) })
await page.reload()
await page.waitForTimeout(2600)
// 打开侧栏
const open = await page.evaluate(() => document.querySelector('.tm_statusRail')?.getAttribute('data-open'))
if (open !== '1') { await page.click('button.tm_statusRailTab'); await page.waitForTimeout(500) }
const info = await page.evaluate(() => {
  const cur = document.querySelector('[data-talkmap-current]')
  const head = cur?.querySelector('[class*="statusRailCurrentHead"]')
  const card = cur?.querySelector('[class*="statusRailCard"]')
  return {
    hasBlock: cur !== null,
    head: head?.textContent?.trim() ?? null,
    title: card?.querySelector('[class*="cardTitle"]')?.textContent?.trim() ?? null,
    back: cur?.querySelector('[class*="statusRailCurrentBack"]')?.textContent?.trim() ?? null,
    railRows: document.querySelectorAll('.tm_statusRailSlot').length,
  }
})
console.log(JSON.stringify(info))
// 点它应打开会话
if (info.hasBlock) {
  await page.evaluate(() => { window.__harness.log.length = 0 })
  await page.click('[data-talkmap-current] [class*="statusRailCard"]')
  await page.waitForTimeout(600)
  const after = await page.evaluate(() => ({
    opened: window.__harness.log.filter(e => e.kind === 'ui.openSession').length,
    railGone: document.querySelector('.tm_statusRail') === null,
  }))
  console.log('点击当前任务:', JSON.stringify(after))
}
// 草稿预览：写入一条草稿再等一个刷新周期
await page.evaluate(() => {
  const sid = window.__harness.sessions?.()?.[0]?.sessionId
  return sid
})
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
