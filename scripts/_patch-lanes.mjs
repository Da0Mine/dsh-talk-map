/** Prefer the gutter closest to the midpoint, so the line takes the shortest visible detour. */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

const oldA = String.raw`          const lanesY = bands(cardsInDrawer.map(card => card.y), 104)
          const lanesX = bands(cardsInDrawer.map(card => card.x), 224)
          const shapes: { x: number; y: number }[][] = []`

const newA = String.raw`          const midY = (startPoint.y + endPoint.y) / 2
          const midX = (startPoint.x + endPoint.x) / 2
          const lanesY = bands(cardsInDrawer.map(card => card.y), 104)
            .sort((a, b) => Math.abs(a - midY) - Math.abs(b - midY))
          const lanesX = bands(cardsInDrawer.map(card => card.x), 224)
            .sort((a, b) => Math.abs(a - midX) - Math.abs(b - midX))
          const shapes: { x: number; y: number }[][] = []`

if (!text.includes(oldA)) {
  console.log('lanes anchor missing')
  process.exit(1)
}
text = text.replace(oldA, newA)
fs.writeFileSync(file, text, 'utf8')
console.log('lanes sorted by midpoint')
