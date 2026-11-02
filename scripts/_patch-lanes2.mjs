/**
 * 1) Gutter lanes from the real card rects (row heights differ; the fixed 104 was wrong).
 * 2) Arrow angle from the drawn path itself, not from the face we hoped for.
 * 3) Endpoint snap: the tail must sit on the target border.
 */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

// --- 1) lanes from real rects -------------------------------------------------
const oldBands = String.raw`          const bands = (values: number[], size: number): number[] => {
            const unique = [...new Set(values.map(value => Math.round(value)))].sort((a, b) => a - b)
            const lanes: number[] = []
            for (let index = 1; index < unique.length; index += 1) {
              lanes.push((unique[index - 1]! + size + unique[index]!) / 2)
            }
            const first = unique[0]
            const last = unique[unique.length - 1]
            if (first !== undefined) lanes.unshift(Math.max(8, first - 14))
            if (last !== undefined) lanes.push(last + size + 14)
            return lanes
          }`

const newBands = String.raw`          // Lanes from the real boxes: rows are as tall as their tallest card, so the gap
          // has to be measured between a row's bottom edge and the next row's top edge.
          const bands = (edges: { start: number; end: number }[]): number[] => {
            const sorted = [...edges].sort((a, b) => a.start - b.start)
            const lanes: number[] = []
            let reach = Number.NEGATIVE_INFINITY
            for (const edge of sorted) {
              if (edge.start > reach && Number.isFinite(reach)) lanes.push((reach + edge.start) / 2)
              reach = Math.max(reach, edge.end)
            }
            if (sorted.length > 0) {
              lanes.unshift(Math.max(8, sorted[0]!.start - 14))
              lanes.push(reach + 14)
            }
            return lanes
          }`

if (!text.includes(oldBands)) {
  console.log('bands anchor missing')
  process.exit(1)
}
text = text.replace(oldBands, newBands)

text = text.replace(
  "          const lanesY = bands(cardsInDrawer.map(card => card.y), 104)\n            .sort((a, b) => Math.abs(a - midY) - Math.abs(b - midY))",
  "          const lanesY = bands(cardsInDrawer.map(card => ({ start: card.y, end: card.y + card.h })))\n            .sort((a, b) => Math.abs(a - midY) - Math.abs(b - midY))",
)
text = text.replace(
  "          const lanesX = bands(cardsInDrawer.map(card => card.x), 224)\n            .sort((a, b) => Math.abs(a - midX) - Math.abs(b - midX))",
  "          const lanesX = bands(cardsInDrawer.map(card => ({ start: card.x, end: card.x + card.w })))\n            .sort((a, b) => Math.abs(a - midX) - Math.abs(b - midX))",
)

// --- 2) arrow angle from the drawn path --------------------------------------
const oldAngle = String.raw`        const angle = toSide === 'l' ? 180 : toSide === 'r' ? 0 : toSide === 't' ? -90 : 90`

const newAngle = String.raw`        // Arrow direction: read it off the path that is actually drawn (a curve arrives
        // along its own tangent, a polyline along its last leg). Using the face we wanted
        // made the arrow point sideways whenever the fallback took another route.
        const tailHint = (d: string): number => {
          const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
          if (numbers.length < 8) return toSide === 'l' ? 180 : toSide === 'r' ? 0 : toSide === 't' ? -90 : 90
          const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = numbers.slice(-8) as number[]
          // Cubic: tangent at t=1 is end - control2. Quadratic/line: end - previous point.
          const dx = ex! - (c2x !== undefined ? c2x : c1x!)
          const dy = ey! - (c2y !== undefined ? c2y : c1y!)
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return toSide === 'l' ? 180 : toSide === 'r' ? 0 : toSide === 't' ? -90 : 90
          return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 180) : (dy >= 0 ? 90 : -90)
        }
        const angle = tailHint(bestD ?? '')`

if (!text.includes(oldAngle)) {
  console.log('angle anchor missing')
  process.exit(1)
}
text = text.replace(oldAngle, newAngle)

fs.writeFileSync(file, text, 'utf8')
console.log('lanes + arrow patched')
