/** Probe the real DSH web UI's DOM: how messages are rendered + does find() work. */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))
const URL_TARGET = process.argv[2] ?? 'http://127.0.0.1:23924'
const CDP = 9351
const profileDir = path.join(os.tmpdir(), 'dsh-dom-probe')

fs.rmSync(profileDir, { recursive: true, force: true })
const edge = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--window-size=1500,1000', '--headless=new', 'about:blank',
], { stdio: 'ignore', detached: false })

async function waitForCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP}/json/version`)
      if (response.ok) return await response.json()
    } catch { /* not up */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('no CDP')
}

const version = await waitForCdp()
console.log(`Edge ${version.Browser}`)
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0] ?? await browser.newContext()
const page = context.pages()[0] ?? await context.newPage()
page.on('pageerror', error => console.log('PAGEERROR', String(error)))

await page.goto(URL_TARGET, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(4000)
console.log('title:', await page.title())
console.log('url:', page.url())

const shape = await page.evaluate(() => {
  const interesting = new Set()
  for (const element of document.querySelectorAll('*')) {
    const cls = typeof element.className === 'string' ? element.className : ''
    if (!cls) continue
    for (const token of cls.split(/\s+/)) {
      if (/messag|bubble|turn|chat|segment|markdown|role|transcript|virtual|scroll/i.test(token)) {
        interesting.add(token)
      }
    }
  }
  const scrollers = [...document.querySelectorAll('div, main, section')]
    .filter((element) => element.scrollHeight > element.clientHeight + 80)
    .map((element) => ({
      cls: typeof element.className === 'string' ? element.className.slice(0, 60) : '',
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
    }))
    .sort((a, b) => b.scrollHeight - a.scrollHeight)
    .slice(0, 6)
  return {
    classTokens: [...interesting].slice(0, 40),
    scrollers,
    bodyTextLength: document.body.innerText.length,
    hasFind: typeof window.find === 'function',
  }
})
console.log('shape:', JSON.stringify(shape, null, 2))

const findTest = await page.evaluate(() => {
  const probe = '的'
  const result = typeof window.find === 'function' ? window.find(probe, false, false, true, false, false, false) : null
  const selection = window.getSelection()
  return { result, selected: selection === null ? null : String(selection).slice(0, 40) }
})
console.log('window.find:', JSON.stringify(findTest))

const messages = await page.evaluate(() => {
  const out = []
  for (const element of document.querySelectorAll('[data-testid], [class]')) {
    const text = element.textContent ?? ''
    if (text.length < 30 || text.length > 4000) continue
    const cls = typeof element.className === 'string' ? element.className : ''
    if (!/messag|bubble|turn|markdown|segment/i.test(cls)) continue
    out.push({ cls: cls.slice(0, 70), len: text.length, head: text.slice(0, 60) })
    if (out.length >= 8) break
  }
  return out
})
console.log('message-ish:', JSON.stringify(messages, null, 2))

await browser.close()
edge.kill()
