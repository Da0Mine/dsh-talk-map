
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

function Panel() {
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

createRoot(document.getElementById('root')).render(<Panel />)
