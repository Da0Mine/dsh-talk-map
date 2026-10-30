/**
 * Render three candidate "light" treatments side by side so one can be picked
 * before any more plugin code is written.
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

const D = 'M60 0 H300 Q320 0 320 20 V60 Q320 80 340 80 H640 Q660 80 660 60 V20 Q660 0 680 0 H840'

/** Exactly what TalkMapEdge renders (same numbers), so the shot is faithful. */
const edgeSvg = `
  <path id="r1" d="${D}" fill="none" stroke="rgba(226,232,242,0.6)" stroke-width="1.6" stroke-linecap="round"/>
  <defs>
    <linearGradient id="ramp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(186,210,255,0)"/>
      <stop offset="38%" stop-color="rgba(198,220,255,0.22)"/>
      <stop offset="72%" stop-color="rgba(230,240,255,0.62)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.96)"/>
    </linearGradient>
    <radialGradient id="bloom">
      <stop offset="0%" stop-color="rgba(224,238,255,0.55)"/>
      <stop offset="55%" stop-color="rgba(196,218,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(190,214,255,0)"/>
    </radialGradient>
  </defs>
  <mask id="onpath" maskUnits="userSpaceOnUse" x="-200" y="-400" width="1400" height="900"><path d="${D}" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/></mask>
  <g mask="url(#onpath)">
  <g style="filter:blur(0.8px)">
    <animateMotion dur="2.8s" repeatCount="indefinite" rotate="auto" calcMode="spline"
      keyTimes="0;1" keyPoints="0;1" keySplines="0.4 0 0.55 1"><mpath href="#r1"/></animateMotion>
    <animate attributeName="opacity" dur="2.8s" repeatCount="indefinite"
      values="0;1;1;0" keyTimes="0;0.08;0.9;1"/>
    <path d="M0 -1.4 C -30 -3.6, -70 -5.2, -126 -4.2 C -132 -1.4, -132 1.4, -126 4.2 C -70 5.2, -30 3.6, 0 1.4 Z"
          fill="url(#ramp)" opacity="0.75"/>
    <ellipse rx="34" ry="3.4" fill="url(#ramp)" opacity="0.9"/>
    <ellipse rx="10" ry="4.2" fill="rgba(255,255,255,0.5)"/>
    <ellipse rx="5.5" ry="3.4" fill="rgba(255,255,255,0.98)"/>
  </g>
  <g style="filter:blur(6px)">
    <animateMotion dur="2.8s" repeatCount="indefinite" rotate="auto" calcMode="spline"
      keyTimes="0;1" keyPoints="0;1" keySplines="0.4 0 0.55 1"><mpath href="#r1"/></animateMotion>
    <animate attributeName="opacity" dur="2.8s" repeatCount="indefinite"
      values="0;1;1;0" keyTimes="0;0.08;0.9;1"/>
    <ellipse rx="22" ry="12" fill="url(#bloom)"/>
    <ellipse cx="-40" rx="26" ry="7" fill="url(#bloom)" opacity="0.55"/>
  </g>`

const html = `<!doctype html>
<meta charset="utf-8" />
<body style="margin:0;background:#16181d;font-family:system-ui">
<svg width="920" height="200" viewBox="0 0 920 200">
  <text x="60" y="140" fill="#8b93a3" font-size="12">同步中：彗星（亮头 + 渐弱长尾 + 光晕），贴着曲线走</text>
  <g transform="translate(0,40)">${edgeSvg}</g>
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
await page.setViewportSize({ width: 920, height: 420 })
await page.goto('file:///' + pageFile.replace(/\\/g, '/'))
await page.waitForTimeout(500)

const outDir = path.join('test', 'shots')
fs.mkdirSync(outDir, { recursive: true })
for (const [index, delay] of [500, 900, 900].entries()) {
  await page.waitForTimeout(delay)
  const file = path.join(outDir, `edge-preview-${index + 1}.png`)
  await page.screenshot({ path: file })
  console.log('shot:', file)
}

await browser.close()
edge.kill()
