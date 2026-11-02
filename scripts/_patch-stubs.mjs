/** Gutter shapes must leave and enter along the face normals. */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

const oldShapes = String.raw`          const shapes: { x: number; y: number }[][] = []
          for (const lane of lanesY) {
            shapes.push([startPoint, { x: startPoint.x, y: lane }, { x: endPoint.x, y: lane }, endPoint])
          }
          for (const lane of lanesX) {
            shapes.push([startPoint, { x: lane, y: startPoint.y }, { x: lane, y: endPoint.y }, endPoint])
          }`

const newShapes = String.raw`          // Stubs along the face normals: without them the first/last leg can run along a
          // card's own edge and the arrow ends up pointing out of the card.
          const startStub = { x: startPoint.x + startNormal.x * 12, y: startPoint.y + startNormal.y * 12 }
          const endStub = { x: endPoint.x + endNormal.x * 12, y: endPoint.y + endNormal.y * 12 }
          const shapes: { x: number; y: number }[][] = []
          for (const lane of lanesY) {
            shapes.push([
              startPoint, startStub, { x: startStub.x, y: lane }, { x: endStub.x, y: lane }, endStub, endPoint,
            ])
          }
          for (const lane of lanesX) {
            shapes.push([
              startPoint, startStub, { x: lane, y: startStub.y }, { x: lane, y: endStub.y }, endStub, endPoint,
            ])
          }`

if (!text.includes(oldShapes)) {
  console.log('shapes anchor missing')
  process.exit(1)
}
text = text.replace(oldShapes, newShapes)

// The arrival direction for these shapes must be the end normal, not the last lane leg.
text = text.replace(
  String.raw`              const last = shape[shape.length - 1]!
              const before = shape[shape.length - 2] ?? last
              arrival = { x: last.x - before.x, y: last.y - before.y }`,
  String.raw`              arrival = { x: endPoint.x - endStub.x, y: endPoint.y - endStub.y }`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('normal stubs patched')
