import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9671
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'click-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1700,1050','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1700,height:1050})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,150)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
await page.click('button.tm_statusRailTab')
await page.waitForTimeout(500)

const state = () => page.evaluate(() => {
  const viewport = document.querySelector('.react-flow__viewport')
  const selected = [...document.querySelectorAll('.react-flow__node.selected')].map(n => n.getAttribute('data-id'))
  return {
    transform: viewport === null ? null : viewport.style.transform,
    selected,
    rows: [...document.querySelectorAll('.tm_statusRailSlot')].map(el => {
      const card = el.querySelector('.tm_statusRailCard'); const r = card.getBoundingClientRect()
      return { id: card.getAttribute('data-talkmap-session') ?? null, title: el.querySelector('.tm_cardTitle')?.textContent?.trim(), x: Math.round(r.left + 40), y: Math.round(r.top + 30) }
    }),
  }
})
const before = await state()
const target = before.rows[1]
console.log('点击目标:', JSON.stringify({ title: target.title, session: target.id }))
await page.mouse.move(target.x, target.y)
await page.mouse.down(); await page.waitForTimeout(90)
await page.mouse.up()
await page.waitForTimeout(500)
const after = await state()
console.log('点击后 selected:', JSON.stringify(after.selected), ' 视口变化:', before.transform !== after.transform)
// 再验证一次拖动仍然改序
const rows2 = (await state()).rows
await page.mouse.move(rows2[2].x, rows2[2].y)
await page.mouse.down(); await page.waitForTimeout(80)
await page.mouse.move(rows2[0].x, rows2[0].y - 20, { steps: 12 }); await page.waitForTimeout(200)
await page.mouse.up(); await page.waitForTimeout(400)
const afterDrag = await state()
console.log('拖动后顺序:', JSON.stringify(afterDrag.rows.map(r => r.title)))
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
