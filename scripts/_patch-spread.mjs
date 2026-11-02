/**
 * 1) Spread wires that share a lane so they stop overlapping.
 * 2) Put the arrow head just outside the card border: it is drawn behind the cards, so a
 *    head sitting on the border is half covered and reads as a backwards triangle.
 */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

// --- 1) lane offset per wire ---------------------------------------------------
const oldShapes = String.raw`          const shapes: { x: number; y: number }[][] = []
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

const newShapes = String.raw`          // Wires that pick the same gutter would be drawn on top of each other, which reads
          // as one thick line. Give each one a stable small offset inside the gap.
          const seed = (link.from + '>' + link.to).split('')
            .reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 1000, 7)
          const laneOffset = ((seed % 7) - 3) * 1.6
          const shapes: { x: number; y: number }[][] = []
          for (const lane of lanesY) {
            const at = lane + laneOffset
            shapes.push([
              startPoint, startStub, { x: startStub.x, y: at }, { x: endStub.x, y: at }, endStub, endPoint,
            ])
          }
          for (const lane of lanesX) {
            const at = lane + laneOffset
            shapes.push([
              startPoint, startStub, { x: at, y: startStub.y }, { x: at, y: endStub.y }, endStub, endPoint,
            ])
          }`

if (!text.includes(oldShapes)) {
  console.log('shapes anchor missing')
  process.exit(1)
}
text = text.replace(oldShapes, newShapes)

// --- 2) arrow head outside the border -----------------------------------------
text = text.replace(
  "          ax: endPoint.x,\n          ay: endPoint.y,",
  "          ax: endPoint.x - endNormal.x * 2.5,\n          ay: endPoint.y - endNormal.y * 2.5,",
)

fs.writeFileSync(file, text, 'utf8')
console.log('lane offset + arrow offset patched')
