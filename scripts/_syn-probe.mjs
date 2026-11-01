import { pickFaces } from '../src/client/edge-routing.ts'
import { routeEdge } from '../src/client/edge-route.ts'
const CARD_W = 224, CARD_H = 120
const cards = [
  { id: 'L1', x: 0, y: 0 }, { id: 'L2', x: 0, y: 176 },
  { id: 'P', x: 272, y: 0 }, { id: 'M', x: 272, y: 176 }, { id: 'C', x: 272, y: 352 },
  { id: 'F', x: 900, y: 88 },
].map(c => ({ ...c, w: CARD_W, h: CARD_H }))
const from = cards.find(c => c.id === 'P'), to = cards.find(c => c.id === 'C')
const faces = pickFaces({ id: 'P', x: from.x, y: from.y }, { id: 'C', x: to.x, y: to.y },
  cards.map(c => ({ id: c.id, x: c.x, y: c.y })), { cardWidth: CARD_W, cardHeight: CARD_H })
const others = cards.filter(c => c.id !== 'P' && c.id !== 'C')
const pts = routeEdge(from, to, faces.fromHandle, faces.toHandle,
  [{ x: from.x, y: from.y, w: CARD_W, h: CARD_H }, { x: to.x, y: to.y, w: CARD_W, h: CARD_H },
   ...others.map(c => ({ x: c.x, y: c.y, w: CARD_W, h: CARD_H }))])
console.log('faces:', JSON.stringify(faces))
console.log('points:', JSON.stringify(pts))
const verticals = [], horizontals = []
for (let i = 1; i < pts.length; i++) {
  const a = pts[i-1], b = pts[i]
  if (Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) > 2) verticals.push(a.x)
  if (Math.abs(a.y - b.y) < 0.6 && Math.abs(a.x - b.x) > 2) horizontals.push(a.y)
}
console.log('vertical x:', JSON.stringify(verticals), '| gap centre should be', (224 + 272) / 2)
console.log('horizontal y:', JSON.stringify(horizontals), '| centres should be', (120 + 176) / 2, 'and', (296 + 352) / 2)