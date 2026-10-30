/**
 * Iterate the edge look standalone and screenshot it, before touching the plugin.
 *
 *   node scripts/_edge-preview.mjs
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))

const FLOW_S = 2.6

const html = `<!doctype html>
<meta charset="utf-8" />
<body style="margin:0;background:#16181d;font-family:system-ui">
<svg width="900" height="420" viewBox="0 0 900 420">
  <defs>
    <!-- A stretched gradient: bright near the head, gone by the tail. -->
    <radialGradient id="comet" cx="78%" cy="50%" r="78%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.98)"/>
      <stop offset="26%" stop-color="rgba(228,240,255,0.62)"/>
      <stop offset="58%" stop-color="rgba(200,222,255,0.22)"/>
      <stop offset="100%" stop-color="rgba(190,214,255,0)"/>
    </radialGradient>
    <radialGradient id="halo" cx="70%" cy="50%" r="70%">
      <stop offset="0%" stop-color="rgba(210,230,255,0.55)"/>
      <stop offset="55%" stop-color="rgba(190,214,255,0.16)"/>
      <stop offset="100%" stop-color="rgba(190,214,255,0)"/>
    </radialGradient>
  </defs>

  <path id="r1" d="M60 90 H300 Q320 90 320 110 V150 Q320 170 340 170 H640 Q660 170 660 150 V110 Q660 90 680 90 H840"
        fill="none" stroke="rgba(226,232,242,0.55)" stroke-width="1.5" stroke-linecap="round"/>

  <!-- A single soft capsule travelling the whole line, plus a wider halo.
       One dash = no beads; blur softens both ends into a gradient. -->
  <path d="M60 90 H300 Q320 90 320 110 V150 Q320 170 340 170 H640 Q660 170 660 150 V110 Q660 90 680 90 H840"
        fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.6" stroke-linecap="round"
        pathLength="100" stroke-dasharray="12 88" style="filter:blur(1.1px)">
    <animate attributeName="stroke-dashoffset" dur="2.6s" repeatCount="indefinite"
      values="12;0;-88" keyTimes="0;0.1;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.3 0 0.5 1"/>
  </path>
  <path d="M60 90 H300 Q320 90 320 110 V150 Q320 170 340 170 H640 Q660 170 660 150 V110 Q660 90 680 90 H840"
        fill="none" stroke="rgba(190,214,255,0.45)" stroke-width="9" stroke-linecap="round"
        pathLength="100" stroke-dasharray="20 80" style="filter:blur(5px)">
    <animate attributeName="stroke-dashoffset" dur="2.6s" repeatCount="indefinite"
      values="20;0;-80" keyTimes="0;0.1;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.3 0 0.5 1"/>
  </path>
  <path d="M60 300 H840" fill="none" stroke="rgba(200,206,216,0.34)" stroke-width="1.6"
        stroke-linecap="round" stroke-dasharray="6 5"/>

  <text x="60" y="60" fill="#8b93a3" font-size="13">同步中</text>
  <text x="60" y="270" fill="#8b93a3" font-size="13">未同步</text>
</svg>
</body>`

const profileDir = path.join(os.tmpdir(), 'talkmap-edge-preview')
fs.rmSync(profileDir, { recursive: true, force: true })
const pageFile = path.join(os.tmpdir(), 'talkmap-edge-preview.html')
fs.writeFileSync(pageFile, html, 'utf8')

const CDP = 9361
const edge = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--window-size=920,440', '--headless=new', 'about:blank',
], { stdio: 'ignore' })

async function waitForCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP}/json/version`)
      if (response.ok) return await response.json()
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('no CDP')
}

await waitForCdp()
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0] ?? await browser.newContext()
const page = context.pages()[0] ?? await context.newPage()
await page.setViewportSize({ width: 920, height: 440 })
await page.goto('file:///' + pageFile.replace(/\\/g, '/'))
await page.waitForTimeout(400)

const outDir = path.join('test', 'shots')
fs.mkdirSync(outDir, { recursive: true })
for (const [index, delay] of [400, 700, 700, 700].entries()) {
  await page.waitForTimeout(delay)
  const file = path.join(outDir, `edge-preview-${index + 1}.png`)
  await page.screenshot({ path: file })
  console.log('shot:', file)
}

await browser.close()
edge.kill()
