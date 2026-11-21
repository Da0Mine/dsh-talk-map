/**
 * Drag benchmark: seeds N synthetic cards into the demo board, then pans with a real mouse
 * drag and samples frame intervals. Prints paint time, rendered card count and frame stats.
 *
 * Usage: node scripts/_bench-drag.mjs [port] [cards]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const PORT = process.argv[2] ?? '8793'
const CARDS = Number(process.argv[3] ?? '200')
const CDP = 9841
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))

const child = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${path.join(os.tmpdir(), `bench-${Date.now()}`)}`,
  '--no-first-run', '--headless=new', '--window-size=1600,1000', 'about:blank',
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
page.on('pageerror', error => errors.push(String(error).slice(0, 200)))

await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?demo=1`)
await page.waitForTimeout(1500)
await page.evaluate((count) => {
  const key = 'dsh-talk-map.demo-state.v1'
  const saved = JSON.parse(localStorage.getItem(key) ?? 'null') ?? { cards: {}, edges: {}, digests: {}, global: {} }
  const cards = saved.cards ?? {}
  for (let index = 0; index < count; index += 1) {
    const id = `bench-${index}`
    cards[id] = {
      boardId: 'inbox',
      sessionId: `bench-session-${index}`,
      x: (index % 20) * 300,
      y: Math.floor(index / 20) * 260,
      createdAt: Date.now(),
    }
  }
  saved.cards = cards
  localStorage.setItem(key, JSON.stringify(saved))
}, CARDS)

const bootStarted = Date.now()
await page.reload()
await page.waitForFunction(() => window.__harness !== undefined, { timeout: 60000 })
await page.waitForTimeout(4500)
const bootMs = Date.now() - bootStarted

const before = await page.evaluate(() => ({
  cards: document.querySelectorAll('[data-talkmap-session]').length,
  domNodes: document.getElementsByTagName('*').length,
  transform: (() => {
    const el = document.querySelector('.react-flow__viewport')
    return el === null ? null : getComputedStyle(el).transform
  })(),
}))

await page.evaluate(() => {
  window.__frames = []
  window.__rafOn = true
  let last = performance.now()
  const tick = () => {
    const now = performance.now()
    window.__frames.push(now - last)
    last = now
    if (window.__rafOn) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

await page.mouse.move(800, 500)
await page.mouse.down({ button: 'middle' })
for (let step = 1; step <= 40; step += 1) {
  await page.mouse.move(800 + step * 6, 500 + step * 3)
  await page.waitForTimeout(16)
}
await page.mouse.up({ button: 'middle' })

const result = await page.evaluate(() => {
  window.__rafOn = false
  // Frame timestamps tell us whether the spikes are periodic (a poll) or input-driven.
  const spikes = []
  let clock = 0
  for (const value of window.__frames) {
    clock += value
    if (value > 50) spikes.push(Math.round(clock))
  }
  const gaps = spikes.slice(1).map((value, index) => value - spikes[index])
  const sorted = [...window.__frames].sort((a, b) => a - b)
  const el = document.querySelector('.react-flow__viewport')
  return {
    transform: el === null ? null : getComputedStyle(el).transform,
    frames: window.__frames.length,
    spikes,
    gaps,
    median: Math.round(sorted[Math.floor(sorted.length / 2)] ?? 0),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    worst: Math.round(sorted[sorted.length - 1] ?? 0),
  }
})

console.log(JSON.stringify({
  cardsSeeded: CARDS,
  bootMs,
  renderedCards: before.cards,
  domNodes: before.domNodes,
  panMoved: before.transform !== result.transform,
  frame: { frames: result.frames, median: result.median, p95: result.p95, worst: result.worst },
  spikesAtMs: result.spikes,
  spikeGapsMs: result.gaps,
  errors,
}, null, 1))

await page.close()
await browser.close()
child.kill()
