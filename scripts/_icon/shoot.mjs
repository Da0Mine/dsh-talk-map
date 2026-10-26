/**
 * Screenshot the icon candidate page: one 1× full shot, plus a 4× REAL-PIXEL strip
 * per row (1× element screenshot → re-rendered through an <img> at 400% with
 * `image-rendering: pixelated`, i.e. nearest-neighbour on actual pixels).
 */
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PAGE = 'file:///' + path.join(HERE, 'pin-candidates.html').replaceAll('\\', '/')
const OUT = path.join(HERE, 'pin-candidates.png')
const STRIP = path.join(HERE, 'pin-candidates-4x.png')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9451
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-shot-'))

const edge = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--headless=new',
  '--no-first-run',
  '--disable-gpu',
  'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let browser
for (let attempt = 0; attempt < 40; attempt += 1) {
  await sleep(250)
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
    break
  } catch { /* not ready yet */ }
}
if (browser === undefined) {
  console.error('could not attach to Edge')
  edge.kill()
  process.exit(1)
}

const context = browser.contexts()[0] ?? await browser.newContext()
const page = await context.newPage()
await page.setViewportSize({ width: 900, height: 800 })
await page.goto(PAGE)
await page.waitForTimeout(400)
await page.screenshot({ path: OUT, fullPage: true })

// Rows → 1× real pixels → 4× nearest via an <img>.
const boxes = await page.evaluate(() => Array.prototype.map.call(
  document.querySelectorAll('.trow'),
  (node) => {
    const r = node.getBoundingClientRect()
    return [r.left, r.top, r.width, r.height]
  },
))
const parts = []
for (const [x, y, width, height] of boxes) {
  const shot = await page.screenshot({
    fullPage: true,
    clip: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) },
  })
  parts.push(shot.toString('base64'))
}

const zoom = await context.newPage()
const html = `<body style="margin:0;background:#1b1b1d">${parts.map((data) => (
  `<div style="padding:6px 8px"><img src="data:image/png;base64,${data}"
     style="width:400%;image-rendering:pixelated;display:block"></div>`
)).join('')}</body>`
await zoom.setContent(html, { waitUntil: 'load' })
await zoom.waitForTimeout(300)
await zoom.screenshot({ path: STRIP, fullPage: true })
console.log('wrote', path.basename(OUT), '+', path.basename(STRIP))

await browser.close().catch(() => {})
edge.kill()
fs.rmSync(profile, { recursive: true, force: true })
