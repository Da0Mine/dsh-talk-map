/**
 * Drawer wire geometry, in a real browser: a scrolling panel with a grid of cards and an
 * absolutely-positioned wire overlay, measured and routed the way the drawer does it.
 *
 * Checks the two reported symptoms:
 *   • a wire leaving the content box (top-row cards wired through their top faces)
 *   • wires that do not line up with the cards they claim to connect
 *
 *   node scripts/_drawer-geometry.mjs [--shot name.png]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { build } from 'esbuild'
import { chromium } from 'playwright-core'

const entry = `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { routeEdge, roundedPath } from '../../src/client/edge-route.ts'
import { pickFaces } from '../../src/client/edge-routing.ts'

const CARD_W = 224
const CARD_H = 120
const GAP_X = 48
const GAP_Y = 56
const COLS = 3
const ROWS = 5
const FACES = ['t', 'r', 'b', 'l']

const cards = []
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    cards.push({ id: 'c' + row + '_' + col, x: col * (CARD_W + GAP_X), y: row * (CARD_H + GAP_Y), w: CARD_W, h: CARD_H })
  }
}

// The links the user described: top-row cards through their top faces, and a long one
// down a column.
const LINKS = [
  { from: 'c0_0', to: 'c1_0' },
  { from: 'c0_1', to: 'c2_1' },
  { from: 'c0_2', to: 'c3_0' },
  { from: 'c1_0', to: 'c0_0' },
  { from: 'c2_1', to: 'c0_1' },
]

const STALE = ${process.argv.includes('--stale')}

function Panel() {
  // The drawer animates open: a container that starts at scale 0.9 and settles at 1 over
  // ~300ms. getBoundingClientRect returns SCALED values inside it, so a wire measured
  // once at mount is permanently off by that factor — the "错位" being reported.
  const [scale, setScale] = React.useState(STALE ? 0.9 : 1)
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    if (!STALE) return
    const started = performance.now()
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / 300)
      setScale(0.9 + 0.1 * t)
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [])
  React.useEffect(() => {
    if (STALE) return
    // Re-measure every frame until the geometry stops moving (what the drawer now does).
    let stable = 0
    let last = ''
    let frame = 0
    let handle = 0
    const tick = () => {
      const scroller = document.querySelector('[data-scroller]')
      const signature = scroller === null ? '' : [...scroller.querySelectorAll('[data-card-id]')]
        .map(element => { const r = element.getBoundingClientRect(); return Math.round(r.width) + "x" + Math.round(r.height) }).join("|")
      stable = signature === last ? stable + 1 : 0
      last = signature
      frame += 1
      setTick(value => value + 1)
      if (stable < 3 || frame < 12) handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [])
  const contentWidth = COLS * (CARD_W + GAP_X) - GAP_X
  const contentHeight = ROWS * (CARD_H + GAP_Y) - GAP_Y

  const wires = LINKS.map(link => {
    const from = cards.find(card => card.id === link.from)
    const to = cards.find(card => card.id === link.to)
    const others = cards.filter(card => card !== from && card !== to)
    const faces = pickFaces({ id: from.id, x: from.x, y: from.y }, { id: to.id, x: to.x, y: to.y }, cards,
      { cardWidth: CARD_W, cardHeight: CARD_H })

    const dirty = candidate => {
      let hits = 0
      for (let index = 1; index < candidate.length; index += 1) {
        const a = candidate[index - 1]
        const b = candidate[index]
        const steps = Math.max(2, Math.ceil((Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) / 2))
        for (let step = 0; step <= steps; step += 1) {
          const ratio = step / steps
          const point = { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio }
          for (const box of others) {
            if (point.x > box.x + 1 && point.x < box.x + box.w - 1 && point.y > box.y + 1 && point.y < box.y + box.h - 1) hits += 1
          }
          if (point.x < 2 || point.y < 2 || point.x > contentWidth - 2 || point.y > contentHeight - 2) hits += 1
        }
      }
      return hits
    }

    let points = routeEdge(from, to, faces.fromHandle, faces.toHandle, [from, to, ...others])
    let best = dirty(points)
    if (best > 0) {
      let bestPoints = points
      for (const fromFace of FACES) {
        for (const toFace of FACES) {
          if (fromFace === faces.fromHandle && toFace === faces.toHandle) continue
          const attempt = routeEdge(from, to, fromFace, toFace, [from, to, ...others])
          const attemptDirty = dirty(attempt)
          if (attemptDirty < best) { best = attemptDirty; bestPoints = attempt; if (best === 0) break }
        }
        if (best === 0) break
      }
      points = bestPoints
    }
    return { id: link.from + '->' + link.to, from, to, points, d: roundedPath(points, 8), dirty: best }
  })

  return (
    <div data-scroller style={{ position: 'relative', width: 760, height: 420, overflow: 'auto',
      background: '#15171c', border: '1px solid #2a2f38' }}>
      <div style={{ position: 'relative', width: contentWidth, height: contentHeight }}>
        <svg data-wires width={contentWidth} height={contentHeight} style={{ position: 'absolute', left: 0, top: 0 }}>
          {wires.map(wire => (
            <path key={wire.id} data-wire={wire.id} d={wire.d} fill="none" stroke="#c8ced8"
              strokeWidth={1.4} strokeDasharray="6 5" />
          ))}
        </svg>
        {cards.map(card => (
          <div key={card.id} data-card-id={card.id}
            style={{ position: 'absolute', left: card.x, top: card.y, width: card.w, height: card.h,
              boxSizing: 'border-box', background: '#23262d', border: '1px solid #333a45', borderRadius: 10,
              color: '#cfd6e3', fontSize: 11 }}>{card.id}</div>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<div style={{ transform: 'scale(' + 1 + ')', transformOrigin: '0 0' }}><Panel /></div>)
`

fs.mkdirSync('test/shots', { recursive: true })
fs.writeFileSync('test/shots/drawer-entry.tsx', entry, 'utf8')
await build({
  entryPoints: ['test/shots/drawer-entry.tsx'],
  bundle: true,
  outfile: 'test/shots/drawer.js',
  format: 'iife',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'error',
})
fs.writeFileSync('test/shots/drawer.html', `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#0d0f13}</style>
<div id="root"></div><script src="./drawer.js"></script>`, 'utf8')

const EDGE_BIN = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(candidate => fs.existsSync(candidate))
const port = 9501
const child = spawn(EDGE_BIN, [`--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'drawer-' + Date.now())}`,
  '--no-first-run', '--disable-extensions', '--window-size=1200,900', '--headless=new', 'about:blank'], { stdio: 'ignore' })

let ready = false
const started = Date.now()
while (Date.now() - started < 20000 && !ready) {
  try { ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok } catch { /* not up */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 200))
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({ width: 1200, height: 900 })
page.on('pageerror', error => console.log('PAGE ERROR:', String(error).slice(0, 200)))
await page.goto('file:///' + path.resolve('test/shots/drawer.html').replace(/\\/g, '/'))
await page.waitForTimeout(500)

const report = await page.evaluate(() => {
  const scroller = document.querySelector('[data-scroller]')
  const base = scroller.getBoundingClientRect()
  const cards = [...scroller.querySelectorAll('[data-card-id]')].map(element => {
    const rect = element.getBoundingClientRect()
    return { id: element.getAttribute('data-card-id'),
      x: rect.left - base.left + scroller.scrollLeft, y: rect.top - base.top + scroller.scrollTop,
      w: rect.width, h: rect.height }
  })
  const contentWidth = scroller.scrollWidth
  const contentHeight = scroller.scrollHeight
  const wires = [...scroller.querySelectorAll('[data-wire]')].map(element => {
    const d = element.getAttribute('d')
    const total = element.getTotalLength()
    const points = []
    for (let distance = 0; distance <= total; distance += 2) points.push(element.getPointAtLength(distance))
    let outside = 0
    for (const point of points) {
      if (point.x < 0 || point.y < 0 || point.x > contentWidth || point.y > contentHeight) outside += 1
    }
    const head = points[0]
    const tail = points[points.length - 1]
    // how far each end is from the nearest card border
    const nearest = point => Math.min(...cards.map(card => Math.hypot(
      Math.max(card.x - point.x, 0, point.x - (card.x + card.w)),
      Math.max(card.y - point.y, 0, point.y - (card.y + card.h)),
    )))
    return { id: element.getAttribute('data-wire'), outside, headGap: Math.round(nearest(head) * 10) / 10,
      tailGap: Math.round(nearest(tail) * 10) / 10 }
  })
  return { contentWidth, contentHeight, wires }
})

const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : 'test/shots/drawer-geometry.png'
await page.screenshot({ path: shot })
await browser.close()
child.kill()

const bad = report.wires.filter(wire => wire.outside > 0 || wire.headGap > 4 || wire.tailGap > 4)
console.log(JSON.stringify({
  content: [report.contentWidth, report.contentHeight],
  wires: report.wires,
  bad: bad.map(wire => wire.id),
}, null, 1))
process.exitCode = bad.length === 0 ? 0 : 1
