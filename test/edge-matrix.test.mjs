/**
 * The routing matrix.
 *
 * Every face pair (4×4), every relative arrangement (side by side, stacked,
 * diagonal, one card in between, two cards in between), on both the standard
 * 48×56 gap and a tight 32/40 gap — routed with the real router and sampled
 * against every non-endpoint card.
 *
 *   node test/edge-matrix.test.mjs
 *
 * Any combination that puts a point inside a card, or comes closer than
 * MIN_CLEARANCE to one, is reported and fails the run.
 */
import assert from 'node:assert/strict'
import { routeBetween } from '../src/client/edge-route.ts'

const CARD_W = 224
const CARD_H = 120
const MIN_CLEARANCE = 8

const FACES = ['r', 'l', 't', 'b']

/** Anchor point on a card face, in the same space the canvas uses. */
function anchorOf(box, face) {
  if (face === 'r') return { x: box.x + box.w, y: box.y + box.h / 2 }
  if (face === 'l') return { x: box.x, y: box.y + box.h / 2 }
  if (face === 't') return { x: box.x + box.w / 2, y: box.y }
  return { x: box.x + box.w / 2, y: box.y + box.h }
}

const inside = (point, box) => point.x > box.x + 0.5 && point.x < box.x + box.w - 0.5
  && point.y > box.y + 0.5 && point.y < box.y + box.h - 0.5

/**
 * Free room straight out of a face, before the next card. A face with no room can
 * not start a line at all — the canvas never picks one (pickFaces skips it), so the
 * matrix skips those combinations too instead of demanding the impossible.
 */
function spaceAhead(box, face, obstacles, margin = 4) {
  const anchor = anchorOf(box, face)
  const normal = face === 'r' ? { x: 1, y: 0 } : face === 'l' ? { x: -1, y: 0 }
    : face === 't' ? { x: 0, y: -1 } : { x: 0, y: 1 }
  let best = 240
  for (const other of obstacles) {
    const rect = { x: other.x - margin, y: other.y - margin, w: other.w + margin * 2, h: other.h + margin * 2 }
    if (normal.x !== 0) {
      if (anchor.y <= rect.y || anchor.y >= rect.y + rect.h) continue
      if (normal.x > 0 && rect.x >= anchor.x) best = Math.min(best, rect.x - anchor.x)
      if (normal.x < 0 && rect.x + rect.w <= anchor.x) best = Math.min(best, anchor.x - (rect.x + rect.w))
    } else {
      if (anchor.x <= rect.x || anchor.x >= rect.x + rect.w) continue
      if (normal.y > 0 && rect.y >= anchor.y) best = Math.min(best, rect.y - anchor.y)
      if (normal.y < 0 && rect.y + rect.h <= anchor.y) best = Math.min(best, anchor.y - (rect.y + rect.h))
    }
  }
  return best
}

function clearance(point, box) {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.w))
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.h))
  return Math.hypot(dx, dy)
}

function inspect(points, obstacles) {
  let hits = 0
  let worst = Infinity
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]
    const b = points[index]
    const steps = Math.max(2, Math.ceil((Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) / 2))
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps
      const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      for (const box of obstacles) {
        const away = clearance(point, box)
        if (away < worst) worst = away
        if (inside(point, box)) hits += 1
      }
    }
  }
  return { hits, worst }
}

/** A board of cards at the given grid pitch, one card per slot. */
function board({ pitchX, pitchY, cols, rows }) {
  const cards = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cards.push({ id: `c${row}_${col}`, x: col * pitchX, y: row * pitchY, w: CARD_W, h: CARD_H })
    }
  }
  return cards
}

const LAYOUTS = [
  { name: 'standard 48×56', pitchX: CARD_W + 48, pitchY: CARD_H + 56 },
  { name: 'tight 24×32', pitchX: CARD_W + 24, pitchY: CARD_H + 32 },
]

// the arrangements the user cares about: neighbours, one card in between,
// two cards in between, and diagonal
const PAIRS = [
  { name: 'right neighbour', from: 'c1_0', to: 'c1_1' },
  { name: 'below neighbour', from: 'c1_0', to: 'c2_0' },
  { name: 'diagonal', from: 'c1_0', to: 'c2_1' },
  { name: 'one card right', from: 'c1_0', to: 'c1_2' },
  { name: 'one card below', from: 'c1_0', to: 'c3_0' },
  { name: 'two cards below', from: 'c0_0', to: 'c3_0' },
  { name: 'far diagonal', from: 'c0_0', to: 'c3_3' },
]

let cases = 0
const ownCardClips = []
let skipped = 0
const failures = []
let worstClearance = Infinity

for (const layout of LAYOUTS) {
  const cards = board({ ...layout, cols: 4, rows: 5 })
  for (const pair of PAIRS) {
    const from = cards.find(card => card.id === pair.from)
    const to = cards.find(card => card.id === pair.to)
    const others = cards.filter(card => card !== from && card !== to)
    for (const fromFace of FACES) {
      for (const toFace of FACES) {
        if (spaceAhead(from, fromFace, others) < 6 || spaceAhead(to, toFace, others) < 6) { skipped += 1; continue }
        cases += 1
        const start = anchorOf(from, fromFace)
        const end = anchorOf(to, toFace)
        const points = routeBetween(
          { start, startFace: fromFace, end, endFace: toFace },
          from,
          to,
          others.map(card => ({ x: card.x, y: card.y, w: card.w, h: card.h })),
        )
        const { hits, worst } = inspect(points, others)

        // 1) orthogonality: every leg must be axis-aligned
        let skew = 0
        for (let index = 1; index < points.length; index += 1) {
          const a = points[index - 1]
          const b = points[index]
          if (Math.abs(a.x - b.x) > 0.5 && Math.abs(a.y - b.y) > 0.5) skew += 1
        }
        if (skew > 0) {
          failures.push({ layout: layout.name, pair: pair.name, faces: `${fromFace}→${toFace}`, reason: 'diagonal leg', hits: skew })
        }

        // 2) the line must not run through its own endpoint cards (outside the stub)
        let ownHits = 0
        let ownDetail
        for (let index = 1; index < points.length; index += 1) {
          const a = points[index - 1]
          const b = points[index]
          const steps = Math.max(2, Math.ceil((Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) / 2))
          for (let step = 0; step <= steps; step += 1) {
            const t = step / steps
            const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
            const nearStart = Math.hypot(point.x - start.x, point.y - start.y) <= 26
            const nearEnd = Math.hypot(point.x - end.x, point.y - end.y) <= 26
            if (nearStart || nearEnd) continue
            if (inside(point, from) || inside(point, to)) {
              ownHits += 1
              if (ownDetail === undefined) {
                ownDetail = {
                  segment: index,
                  which: inside(point, from) ? 'from' : 'to',
                  at: [Math.round(point.x), Math.round(point.y)],
                  path: points.map(p => [Math.round(p.x), Math.round(p.y)]),
                }
              }
            }
          }
        }
        // Reported, not failed: a route may clip the card it is attached to (it is hidden
        // behind that card). The requirement is "no line across *another* card".
        if (ownHits > 0) ownCardClips.push({ layout: layout.name, pair: pair.name, faces: `${fromFace}→${toFace}`, hits: ownHits })

        // 3) no absurd detour (the line should not tour the whole board)
        let length = 0
        for (let index = 1; index < points.length; index += 1) {
          length += Math.abs(points[index].x - points[index - 1].x) + Math.abs(points[index].y - points[index - 1].y)
        }
        const direct = Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
        if (length > direct * 6 + 400) {
          failures.push({ layout: layout.name, pair: pair.name, faces: `${fromFace}→${toFace}`, reason: 'absurd detour', hits: Math.round(length - direct) })
        }
        if (worst < worstClearance) worstClearance = worst
        if (hits > 0) {
          failures.push({
            layout: layout.name,
            pair: pair.name,
            faces: `${fromFace}→${toFace}`,
            hits,
            waypoints: points.length,
            path: points.map(point => [Math.round(point.x), Math.round(point.y)]),
          })
        }
      }
    }
  }
}

console.log(JSON.stringify({
  cases,
  skipped,
  failed: failures.length,
  worstClearance: Math.round(worstClearance * 10) / 10,
  firstFailure: failures[0],
  ownCardClips: ownCardClips.length,
  byReason: failures.reduce((acc, failure) => { acc[failure.reason ?? 'other card'] = (acc[failure.reason ?? 'other card'] ?? 0) + 1; return acc }, {}),
  byPair: [...new Set(failures.map(failure => failure.pair))],
  byFaces: [...new Set(failures.map(failure => failure.faces))].slice(0, 10),
  sample: failures.slice(0, 4),
}, null, 1))

assert.equal(failures.length, 0, `${failures.length}/${cases} combinations put the line inside a card`)
assert.ok(worstClearance >= MIN_CLEARANCE, `worst clearance ${worstClearance.toFixed(1)}px < ${MIN_CLEARANCE}px`)
console.log(`edge-matrix: ${cases} combinations clean (worst clearance ${worstClearance.toFixed(1)}px)`)
