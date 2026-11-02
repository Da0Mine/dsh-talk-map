import { pickFaces } from '../src/client/edge-routing.ts'
const W = 224, H = 120
const from = { id: 'from', x: 0, y: 0 }
const to = { id: 'to', x: W + 48, y: 0 }
console.log(JSON.stringify(pickFaces(from, to, [from, to], { cardWidth: W, cardHeight: H })))
