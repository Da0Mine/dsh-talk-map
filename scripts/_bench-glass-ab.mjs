/**
 * Isolates the glass cost: same page, same board, alternating "glass on" and "glass off"
 * pans. Reports each pan's median/p95 so run-to-run noise is visible instead of averaged away.
 *
 * Usage: node scripts/_bench-glass-ab.mjs [port] [cards]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = process.argv[2] ?? '8793'
const CARDS = Number(process.argv[3] ?? '800')
const CDP = 9921
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))

const child = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${path.join(os.tmpdir(), `glassab-${Date.now()}`)}`,
  '--no-first-run', '--headless=new', '--window-size=1600,1000', 'about:blank',
], { stdio: 'ignore' })

let ready = false
const started = Date.now()
while (Date.now() - started < 20000 && !ready) {
  try { ready = (await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok } catch { /* retry */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 200))
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page = await browser.contexts()[0].newPage()

await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?demo=1`)
await page.waitForTimeout(1200)
await page.evaluate((count) => {
  const key = 'dsh-talk-map.demo-state.v1'
  const saved = JSON.parse(localStorage.getItem(key) ?? 'null') ?? { cards: {}, edges: {}, digests: {}, global: {} }
  const cards = saved.cards ?? {}
  for (let index = 0; index < count; index += 1) {
    cards[`bench-${index}`] = {
      boardId: 'inbox',
      sessionId: `bench-session-${index}`,
      x: (index % 20) * 300,
      y: Math.floor(index / 20) * 260,
      createdAt: Date.now(),
    }
  }
  saved.cards = cards
  localStorage.setItem(key, JSON.stringify(saved))
  localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')
}, CARDS)
await page.reload()
await page.waitForFunction(() => window.__harness !== undefined, { timeout: 60000 })
await page.waitForTimeout(4000)

const pan = async () => {
  const result = await page.evaluate(async () => {
    window.__frames = []
    window.__on = true
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      window.__frames.push(now - last)
      last = now
      if (window.__on) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return true
  })
  void result
  await page.mouse.move(900, 520)
  await page.mouse.down({ button: 'middle' })
  for (let step = 1; step <= 30; step += 1) {
    await page.mouse.move(900 + step * 7, 520 + step * 3)
    await page.waitForTimeout(16)
  }
  await page.mouse.up({ button: 'middle' })
  return page.evaluate(() => {
    window.__on = false
    const sorted = [...window.__frames].sort((a, b) => a - b)
    const pick = q => Math.round(sorted[Math.floor(sorted.length * q)] ?? 0)
    return { frames: sorted.length, median: pick(0.5), p95: pick(0.95), worst: sorted[sorted.length - 1] ?? 0 }
  })
}

const setGlass = async (on) => {
  await page.evaluate((enabled) => {
    const id = 'glass-ab-override'
    document.getElementById(id)?.remove()
    if (enabled) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = '[class*="statusRailPanel"]{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}'
    document.head.append(style)
  }, on)
  await page.waitForTimeout(400)
}

const runs = []
for (let round = 0; round < 2; round += 1) {
  await setGlass(true)
  await pan() // warm-up
  await page.waitForTimeout(300)
  runs.push({ glass: 'on', ...(await pan()) })
  await setGlass(false)
  await pan()
  await page.waitForTimeout(300)
  runs.push({ glass: 'off', ...(await pan()) })
}
console.log(JSON.stringify({ cards: CARDS, runs }, null, 1))
await page.close()
await browser.close()
child.kill()
