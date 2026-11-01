/**
 * Measure the demo page's *rendered* edges against its *rendered* cards.
 *
 * Everything happens in screen space: `getScreenCTM` maps path points exactly and
 * `getBoundingClientRect` gives the cards exactly — no manual viewport maths, which
 * is where earlier measurements went wrong (a 320px offset made every check lie).
 *
 *   node scripts/_demo-verify.mjs [--shot name.png]
 */
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const EDGE_BIN = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))

const port = 9411
const profile = path.join(os.tmpdir(), 'demo-verify-' + Date.now())
const child = spawn(EDGE_BIN, [
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-extensions', '--window-size=1700,1050', '--headless=new', 'about:blank',
], { stdio: 'ignore' })

let ready = false
const started = Date.now()
while (Date.now() - started < 20000 && !ready) {
  try { ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok } catch { /* not up yet */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 200))
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({ width: 1700, height: 1050 })
await page.goto('file:///' + path.resolve('demo/index.html').replace(/\\/g, '/') + '?demo=1')
await page.waitForTimeout(2500)

const report = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-talkmap-session]')].map(element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  })
  const out = []
  for (const group of document.querySelectorAll('.react-flow__edge')) {
    const element = group.querySelector('.react-flow__edge-path')
    if (element === null) continue
    const matrix = element.getScreenCTM()
    const total = element.getTotalLength()
    const pointAt = distance => {
      const local = element.getPointAtLength(distance)
      return matrix === null ? local : local.matrixTransform(matrix)
    }
    const first = pointAt(0)
    const last = pointAt(total)
    const own = new Set()
    cards.forEach((card, index) => {
      for (const point of [first, last]) {
        if (point.x > card.x - 4 && point.x < card.x + card.w + 4 && point.y > card.y - 4 && point.y < card.y + card.h + 4) own.add(index)
      }
    })
    let inside = 0
    let closest = Infinity
    for (let distance = 0; distance <= total; distance += 2) {
      const point = pointAt(distance)
      cards.forEach((card, index) => {
        if (own.has(index)) return
        const dx = Math.max(card.x - point.x, 0, point.x - (card.x + card.w))
        const dy = Math.max(card.y - point.y, 0, point.y - (card.y + card.h))
        const away = Math.hypot(dx, dy)
        if (away < closest) closest = away
        if (away === 0) inside += 1
      })
    }
    out.push({ id: group.getAttribute('data-id'), inside, closest: Math.round(closest * 10) / 10 })
  }
  return {
    cardCount: cards.length,
    sizes: [...new Set(cards.map(card => Math.round(card.w) + 'x' + Math.round(card.h)))],
    edges: out,
  }
})

const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : 'test/shots/demo-verify.png'
await page.screenshot({ path: shot, fullPage: false })
await browser.close()
child.kill()

const crossing = report.edges.filter(edge => edge.inside > 0)
console.log(JSON.stringify({
  cards: report.cardCount,
  sizes: report.sizes,
  edges: report.edges.length,
  crossing: crossing.length,
  worstClearance: Math.min(...report.edges.map(edge => edge.closest)),
  detail: crossing.slice(0, 4),
}, null, 1))
process.exitCode = crossing.length === 0 ? 0 : 1
