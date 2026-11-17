import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9751
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'resize-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1400,height:900})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,180)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)

// 侧栏（地图关闭）形态
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1000)
const side = await page.evaluate(() => {
  const wrap = document.querySelector('[class*="toggleWrap"]')
  const btns = [...(wrap?.querySelectorAll('button') ?? [])].map(b => ({ title: b.getAttribute('title'), back: b.hasAttribute('data-talkmap-back') }))
  const grip = document.querySelector('[class*="queueGrip"]')
  const root = document.querySelector('[data-talkmap-queue-root]')
  return {
    footerButtons: btns,
    crosshairInFooter: btns.some(b => b.back === true),
    gripExists: grip !== null,
    gripOpacity: grip === null ? null : getComputedStyle(grip).opacity,
    queueHeight: root === null ? null : Math.round(root.getBoundingClientRect().height),
  }
})
console.log('侧栏:', JSON.stringify(side))

// 悬停 → 手柄应出现；拖拽 → 高度变化
const gripBox = await page.evaluate(() => {
  const grip = document.querySelector('[class*="queueGrip"]')
  if (grip === null) return null
  const r = grip.getBoundingClientRect()
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
})
if (gripBox !== null) {
  await page.mouse.move(gripBox.x, gripBox.y)
  await page.waitForTimeout(250)
  const hovered = await page.evaluate(() => getComputedStyle(document.querySelector('[class*="queueGrip"]')).opacity)
  await page.mouse.down()
  await page.mouse.move(gripBox.x, gripBox.y - 120, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => ({
    height: Math.round(document.querySelector('[data-talkmap-queue-root]').getBoundingClientRect().height),
    stored: localStorage.getItem('dsh.talk-map.queueHeight'),
    mapButtonVisible: (() => { const b = document.querySelector('[class*="toggleRow"]') ?? document.querySelector('[class*="toggleButton"]'); if (b === null) return false; return b.getBoundingClientRect().bottom <= window.innerHeight })(),
  }))
  console.log('悬停 opacity:', hovered, '拖拽后:', JSON.stringify(after))
  await page.screenshot({ path: 'test/shots/queue-resized.png', clip: { x: 0, y: 0, width: 420, height: 900 } })
}

// 地图面板头部是否有十字准心
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(1200)
const header = await page.evaluate(() => {
  const back = document.querySelector('[data-talkmap-back]')
  const head = document.querySelector('[class*="header"]')
  return {
    headerHasCrosshair: back !== null,
    insideHeader: back !== null && head !== null && head.contains(back),
    title: back?.getAttribute('title') ?? null,
  }
})
console.log('面板头部:', JSON.stringify(header))
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
