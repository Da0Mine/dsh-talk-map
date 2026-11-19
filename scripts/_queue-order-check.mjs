/**
 * Verifies the shared queue ordering in BOTH surfaces against the mirror on :8793.
 * Reads the native sidebar (data-lamp) and the map rail (chip labels), then checks that
 * each is monotonic by priority bucket and that both show the same bucket sequence.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = process.argv[2] ?? '8793'
const CDP = 9821
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))

const child = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${path.join(os.tmpdir(), 'order-' + Date.now())}`,
  '--no-first-run', '--headless=new', '--window-size=1500,1000', 'about:blank',
], { stdio: 'ignore' })

let ready = false
const started = Date.now()
while (Date.now() - started < 20000 && !ready) {
  try { ready = (await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok } catch { /* retry */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 200))
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0]
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(String(error).slice(0, 160)))

await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?demo=1`)
await page.waitForTimeout(2800)
const toggle = async () => {
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
  await page.waitForTimeout(1000)
}

// sidebar queue (map closed)
const panel = await page.evaluate(() => window.__harness.panelState?.()?.selectedPanel ?? null)
if (panel === 'talk-map') await toggle()
const sidebar = await page.evaluate(() => [...document.querySelectorAll('[data-talkmap-queue]')].map(el => ({
  lamp: el.getAttribute('data-lamp'),
  chip: el.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
})))

// map rail (map open)
await toggle()
const rail = await page.evaluate(() => {
  const panelEl = document.querySelector('[class*="statusRailPanel"]')
  if (panelEl === null) return null
  return [...panelEl.querySelectorAll('[class*="statusRailSlot"]')].map(slot => ({
    chip: slot.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
  }))
})

const RANK = { 异常终止: 0, 出错: 0, 等你回复: 1, 待查看: 2, 正在运行: 3, 待发送: 4 }
const ranks = (rows) => rows.map(row => RANK[row.chip] ?? 99)
const monotonic = (list) => list.every((value, index) => index === 0 || list[index - 1] <= value)

console.log('侧栏:', JSON.stringify(sidebar))
console.log('rail:', JSON.stringify(rail))
console.log('侧栏 chip 序:', JSON.stringify(sidebar.map(r => r.chip)))
console.log('rail chip 序:', JSON.stringify(rail === null ? null : rail.map(r => r.chip)))
console.log('侧栏单调:', monotonic(ranks(sidebar)), '| rail 单调:', rail === null ? 'n/a' : monotonic(ranks(rail)))
console.log('两边序列一致:', rail !== null
  && JSON.stringify(sidebar.map(r => r.chip)) === JSON.stringify(rail.map(r => r.chip)))
console.log('errors:', JSON.stringify(errors))
await page.close()
await browser.close()
child.kill()
