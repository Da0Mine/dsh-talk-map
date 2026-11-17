import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const port=9761
const child=spawn(EDGE,[`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'remote-'+Date.now())}`,'--no-first-run','--headless=new','--window-size=1400,900','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${port}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page=browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({width:1400,height:900})
const errors=[]; page.on('pageerror', e => errors.push(String(e).slice(0,180)))
await page.goto('file:///'+path.resolve('demo/index.html').replace(/\\/g,'/')+'?demo=1')
await page.waitForTimeout(2600)
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
await page.waitForTimeout(900)
const info = await page.evaluate(() => {
  // 造一个远程插件的假节点，验证隐藏规则与点击路径
  const fake = document.createElement('div')
  fake.className = 'dshRemoteSidebarEntry'
  const btn = document.createElement('button')
  btn.textContent = 'remote'
  btn.addEventListener('click', () => { window.__remoteClicks = (window.__remoteClicks ?? 0) + 1 })
  fake.appendChild(btn)
  document.body.appendChild(fake)
  const styleTag = document.getElementById('dsh-talk-map-hide-remote-entry')
  const footer = document.querySelector('[class*="toggleWrap"]')
  const btns = [...(footer?.querySelectorAll('button') ?? [])].map(b => ({ title: b.getAttribute('title'), back: b.hasAttribute('data-talkmap-back') }))
  // 走一遍设置页按钮的同款点击逻辑
  const node = document.querySelector('.dshRemoteSidebarEntry')
  ;(node?.querySelector('button') ?? node)?.click()
  return {
    styleInjected: styleTag !== null,
    ruleText: styleTag?.textContent ?? null,
    remoteDisplay: getComputedStyle(fake).display,
    remoteClickWorked: window.__remoteClicks === 1,
    footerButtons: btns,
    crosshairInFooter: btns.some(b => b.back === true),
  }
})
console.log(JSON.stringify(info, null, 1))
console.log('errors:', JSON.stringify(errors))
await browser.close(); child.kill()
