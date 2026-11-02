/** Add the orthogonal gutter fallback behind the curve candidates. */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

const anchor = String.raw`        const angle = toSide === 'l' ? 180 : toSide === 'r' ? 0 : toSide === 't' ? -90 : 90`

const block = String.raw`        // A curve cannot always avoid the cards: between two neighbouring columns a card
        // fills the whole span, so the line has to run in a gutter first. Keep the curve
        // for the pretty cases, fall back to a gutter polyline when it is not clean.
        if (bestCost > 0) {
          const bands = (values: number[], size: number): number[] => {
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
          }
          const samplePolyline = (points: { x: number; y: number }[]) => (t: number) => {
            let total = 0
            for (let index = 1; index < points.length; index += 1) {
              total += Math.abs(points[index]!.x - points[index - 1]!.x) + Math.abs(points[index]!.y - points[index - 1]!.y)
            }
            let walked = 0
            const target = t * total
            for (let index = 1; index < points.length; index += 1) {
              const a = points[index - 1]!
              const b = points[index]!
              const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
              if (walked + length >= target || index === points.length - 1) {
                const ratio = length === 0 ? 0 : Math.min(1, (target - walked) / length)
                return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio }
              }
              walked += length
            }
            return points[points.length - 1]!
          }
          const lanesY = bands(cardsInDrawer.map(card => card.y), 104)
          const lanesX = bands(cardsInDrawer.map(card => card.x), 224)
          const shapes: { x: number; y: number }[][] = []
          for (const lane of lanesY) {
            shapes.push([startPoint, { x: startPoint.x, y: lane }, { x: endPoint.x, y: lane }, endPoint])
          }
          for (const lane of lanesX) {
            shapes.push([startPoint, { x: lane, y: startPoint.y }, { x: lane, y: endPoint.y }, endPoint])
          }
          for (const shape of shapes) {
            const cost = badness(samplePolyline(shape))
            if (cost < bestCost) {
              bestCost = cost
              bestD = roundedPath(shape as never, 10)
              if (cost === 0) break
            }
          }
        }

        const angle = toSide === 'l' ? 180 : toSide === 'r' ? 0 : toSide === 't' ? -90 : 90`

if (!text.includes(anchor)) {
  console.log('angle anchor missing')
  process.exit(1)
}
text = text.replace(anchor, block)
fs.writeFileSync(file, text, 'utf8')
console.log('gutter fallback added')
