import { routeEdge, __routeDebug } from '../src/client/edge-route.ts'
const W = 224, H = 120
const cards = [
  { id: 'top', x: -288, y: -514, w: W, h: H },
  { id: 'mid1', x: -288, y: 100, w: W, h: H },
  { id: 'mid2', x: -288, y: 800, w: W, h: H },
  { id: 'right', x: 200, y: 400, w: W, h: H },
  { id: 'bot', x: -288, y: 3806, w: W, h: H },
]
const from = cards[0], to = cards[4]
const others = cards.filter(c => c !== from && c !== to)
const pts = routeEdge(from, to, 'b', 't', [from, to, ...others])
console.log('debug:', JSON.stringify(__routeDebug))
console.log('points:', JSON.stringify(pts))