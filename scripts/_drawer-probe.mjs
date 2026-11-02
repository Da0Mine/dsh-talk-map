import { routeEdge } from '../src/client/edge-route.ts'
import { pickFaces } from '../src/client/edge-routing.ts'
const W = 250, H = 129, GX = 48, GY = 56, COLS = 3, ROWS = 4
const cards = []
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cards.push({ id: `c${r}_${c}`, x: c * (W + GX), y: r * (H + GY), w: W, h: H })
const dist = (p, b) => Math.hypot(Math.max(b.x - p.x, 0, p.x - (b.x + b.w)), Math.max(b.y - p.y, 0, p.y - (b.y + b.h)))
let worst = Infinity, crossings = 0, cases = 0
for (const a of cards) for (const b of cards) {
  if (a === b) continue
  const others = cards.filter(c => c !== a && c !== b)
  const faces = pickFaces({ id: a.id, x: a.x, y: a.y }, { id: b.id, x: b.x, y: b.y }, cards, { cardWidth: W, cardHeight: H })
  const pts = routeEdge(a, b, faces.fromHandle, faces.toHandle, [a, b, ...others])
  cases++
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i-1], p1 = pts[i]
    const steps = Math.max(2, Math.ceil((Math.abs(p1.x-p0.x)+Math.abs(p1.y-p0.y))/2))
    for (let s = 0; s <= steps; s++) { const t = s/steps, p = { x: p0.x+(p1.x-p0.x)*t, y: p0.y+(p1.y-p0.y)*t }
      for (const o of others) { const d = dist(p, o); if (d < worst) worst = d; if (d === 0) { crossings++; i = 99; break } } }
  }
}
console.log(JSON.stringify({ cards: cards.length, cases, crossings, closest: Math.round(worst*10)/10 }))
