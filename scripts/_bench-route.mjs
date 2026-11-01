import { routeEdge } from '../src/client/edge-route.ts'
const CARD_W = 224, CARD_H = 120
// a realistic folder: 6 cols x 5 rows with 48/56 gaps
const cards = []
for (let row = 0; row < 5; row += 1) {
  for (let col = 0; col < 6; col += 1) {
    cards.push({ x: col * (CARD_W + 48), y: row * (CARD_H + 56), w: CARD_W, h: CARD_H })
  }
}
const pairs = []
for (let index = 0; index < 12; index += 1) {
  const a = cards[index]
  const b = cards[cards.length - 1 - index]
  pairs.push([a, b])
}
const started = performance.now()
let total = 0
for (let round = 0; round < 10; round += 1) {
  for (const [a, b] of pairs) {
    const points = routeEdge(a, b, 'r', 'l', cards)
    total += points.length
  }
}
const elapsed = performance.now() - started
console.log(`30 cards, ${pairs.length} edges x10 rounds: ${elapsed.toFixed(1)} ms total`)
console.log(`per edge: ${(elapsed / 120).toFixed(2)} ms`)
