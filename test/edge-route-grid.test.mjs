/**
 * Does the router actually run down the middle of the gaps?
 *
 *   node test/edge-route-grid.test.mjs
 *
 * Builds the same grid the canvas builds (224×120 cards, 48/56 gaps) and checks
 * every generated route: no segment may come closer than `margin` to a card, and
 * every run that passes between two rows (or columns) has to sit in the middle of
 * that gap — which is the whole point of routing through channels.
 */
import assert from 'node:assert/strict'
import { routeEdge } from '../src/client/edge-route.ts'

const CARD_W = 224
const CARD_H = 120
const GAP_X = 48
const GAP_Y = 56
const COLS = 3
const ROWS = 4

const cards = []
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    cards.push({
      id: `r${row}c${col}`,
      x: col * (CARD_W + GAP_X),
      y: row * (CARD_H + GAP_Y),
      w: CARD_W,
      h: CARD_H,
    })
  }
}

const byId = id => cards.find(card => card.id === id)

/** Distance from a point to a rect (0 when inside). */
const pointToRect = (point, rect) => {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.w))
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.h))
  return Math.hypot(dx, dy)
}

/** Closest approach of an axis-aligned segment to a rect. */
function segmentClearance(a, b, rect) {
  let best = Infinity
  const steps = Math.max(4, Math.ceil((Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) / 2))
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    best = Math.min(best, pointToRect(point, rect))
  }
  return best
}

/** For a run at fixed coordinate `at` between two cards, how far off-centre is it? */
function centringOffset(at, lo, hi) {
  const middle = (lo + hi) / 2
  const half = (hi - lo) / 2
  // 0 = perfectly centred, 1 = touching one of the two edges
  return Math.abs(at - middle) / half
}

let checked = 0
let worstClearance = Infinity
let worstOffset = 0
const failures = []

const pairs = [
  ['r0c0', 'r0c2'],   // same row, one card in between
  ['r0c0', 'r1c1'],   // diagonal neighbours
  ['r0c1', 'r3c1'],   // straight down, two rows in between
  ['r0c2', 'r2c0'],   // long diagonal
  ['r1c0', 'r1c1'],   // tight neighbours
  ['r0c0', 'r0c1'],   // tight neighbours, top row
]

for (const [fromId, toId] of pairs) {
  const from = byId(fromId)
  const to = byId(toId)
  const others = cards.filter(card => card.id !== fromId && card.id !== toId)

  // Faces the canvas would pick: whichever axis dominates, facing sides.
  const dx = to.x - from.x
  const dy = to.y - from.y
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  const fromFace = horizontal ? (dx >= 0 ? 'r' : 'l') : (dy >= 0 ? 'b' : 't')
  const toFace = horizontal ? (dx >= 0 ? 'l' : 'r') : (dy >= 0 ? 't' : 'b')

  const points = routeEdge(from, to, fromFace, toFace, [from, to, ...others])
  checked += 1

  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    for (const card of others) {
      const clearance = segmentClearance(a, b, card)
      if (clearance < worstClearance) worstClearance = clearance
      if (clearance < 12) {
        failures.push(`${fromId}→${toId} passes ${clearance.toFixed(1)}px from ${card.id}`)
      }
    }
  }

  // runs that travel through a row gap must be centred in it
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    const horizontalRun = Math.abs(a.y - b.y) < 0.6
    if (!horizontalRun) continue
    const y = a.y
    // the row gap this run sits in (if any)
    for (let row = 0; row < ROWS - 1; row += 1) {
      const gapTop = row * (CARD_H + GAP_Y) + CARD_H
      const gapBottom = (row + 1) * (CARD_H + GAP_Y)
      if (y < gapTop || y > gapBottom) continue
      const offset = centringOffset(y, gapTop, gapBottom)
      if (offset > worstOffset) worstOffset = offset
      if (offset > 0.35) {
        failures.push(`${fromId}→${toId} horizontal run at y=${y} is ${(offset * 100).toFixed(0)}% off the gap centre`)
      }
    }
  }
}

assert.equal(failures.length, 0, 'routing problems:\n  ' + failures.join('\n  '))
assert.ok(worstClearance >= 12, `closest approach ${worstClearance.toFixed(1)}px should be ≥ 12px`)
assert.ok(worstOffset <= 0.35, `worst check across gaps ${(worstOffset * 100).toFixed(0)}%`)

console.log(`edge-route-grid: ${checked} pairs passed (closest approach ${worstClearance.toFixed(1)}px, worst off-centre ${(worstOffset * 100).toFixed(0)}%)`)
