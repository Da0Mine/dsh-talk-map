import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9711
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'rename-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,150)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)

// 打开重命名对话框：右键卡片 → 重命名
const card = await page.evaluate(() => {
  const el = document.querySelector('[data-talkmap-session]')
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.left + 40), y: Math.round(r.top + 20) }
})
await page.mouse.click(card.x, card.y, { button: 'right' })
await page.waitForTimeout(500)
const menuItems = await page.evaluate(() => [...document.querySelectorAll('[class*="menuItem"]')].map(n => n.textContent.trim()))
const renameIdx = menuItems.findIndex(t => t.includes('重命名'))
await page.evaluate((i) => { document.querySelectorAll('[class*="menuItem"]')[i]?.click() }, renameIdx)
await page.waitForTimeout(600)

const dialog = await page.evaluate(() => {
  const input = document.querySelector('[class*="renameInput"]')
  return input === null ? null : { value: input.value, start: input.selectionStart, end: input.selectionEnd }
})
console.log('对话框初始:', JSON.stringify(dialog))

if (dialog !== null) {
  // 模拟：全选状态（初始化应有）→ 按 ← 取消选择 → 打三个字，看是否把原文全选
  await page.click('[class*="renameInput"]')
  const input = page.locator('[class*="renameInput"]')
  await input.press('End')
  await input.type('ABC', { delay: 40 })
  const after = await page.evaluate(() => {
    const el = document.querySelector('[class*="renameInput"]')
    return { value: el.value, start: el.selectionStart, end: el.selectionEnd, len: el.value.length }
  })
  console.log('打字后:', JSON.stringify(after))
  // 期望：值 = 原标题 + ABC，且没有选区覆盖全文
  console.log('判定——纯追加:', after.value.endsWith('ABC') && after.start === after.end)
}
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
