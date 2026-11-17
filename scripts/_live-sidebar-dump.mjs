import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9741
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'live-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1600,1000','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1600,height:1000})
await page.goto('http://127.0.0.1:38373', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(9000)
// 侧栏默认是窄条(wide=false)，先展开它
const probe1 = await page.evaluate(() => ({
  hasBack: document.querySelector('[data-talkmap-back]') !== null,
  hasQueueRoot: document.querySelector('[data-talkmap-queue-root]') !== null,
  footerBar: document.querySelectorAll('[class*="footerBar"]').length,
  footerAction: document.querySelectorAll('[class*="footerAction"]').length,
  sidebarCandidates: [...document.querySelectorAll('[class*="sidebar" i]')].slice(0, 6).map(el => el.className.toString().slice(0, 60)),
}))
console.log('初始:', JSON.stringify(probe1))
const page1 = await page.evaluate(() => ({
  title: document.title,
  bodyLen: document.body.innerText.length,
  head: document.body.innerText.slice(0, 160).replace(/\s+/g, ' '),
  hasBoot: typeof window.__DSH_BOOT__ !== 'undefined',
}))
console.log('页面:', JSON.stringify(page1))
if (probe1.hasBack === true && probe1.hasQueueRoot === false) {
  // 展开侧栏：点左上角的侧栏开关
  await page.keyboard.press('Control+b').catch(() => {})
  await page.waitForTimeout(1200)
}
const dump = await page.evaluate(() => {
  const root = document.querySelector('[data-talkmap-queue-root]')
  const chain = []
  let el = root
  while (el !== null && chain.length < 7) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    chain.push({
      cls: (el.className || '').toString().slice(0, 70),
      tag: el.tagName,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      display: cs.display, flexDir: cs.flexDirection, alignItems: cs.alignItems, flex: cs.flex,
      width: cs.width, padding: cs.padding, margin: cs.margin, boxSizing: cs.boxSizing,
    })
    el = el.parentElement
  }
  const card = document.querySelector('[data-talkmap-queue]')
  const cardCs = card === null ? null : (() => { const c = getComputedStyle(card); const r = card.getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.x), width: c.width, alignSelf: c.alignSelf, margin: c.margin } })()
  return { found: root !== null, chain, card: cardCs, vw: innerWidth }
})
console.log(JSON.stringify(dump, null, 1).slice(0, 3000))
await browser.close(); child.kill()
