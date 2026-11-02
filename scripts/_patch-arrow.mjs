/** Arrow angle from the geometry we generate, not from parsing the path string. */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) track the arrival direction alongside bestD
text = text.replace(
  "        let bestD: string | undefined\n        let bestCost = Number.POSITIVE_INFINITY",
  "        let bestD: string | undefined\n        let bestCost = Number.POSITIVE_INFINITY\n        // Direction of travel at the very end of the chosen shape (pointing into the card).\n        let arrival = { x: endPoint.x - startPoint.x, y: endPoint.y - startPoint.y }",
)

text = text.replace(
  String.raw`          const cost = badness(sample)
          if (cost < bestCost) {
            bestCost = cost
            bestD = 'M ' + startPoint.x + ' ' + startPoint.y
              + ' C ' + control1.x + ' ' + control1.y + ', ' + control2.x + ' ' + control2.y
              + ', ' + endPoint.x + ' ' + endPoint.y
          }`,
  String.raw`          const cost = badness(sample)
          if (cost < bestCost) {
            bestCost = cost
            bestD = 'M ' + startPoint.x + ' ' + startPoint.y
              + ' C ' + control1.x + ' ' + control1.y + ', ' + control2.x + ' ' + control2.y
              + ', ' + endPoint.x + ' ' + endPoint.y
            arrival = { x: endPoint.x - control2.x, y: endPoint.y - control2.y }
          }`,
)

text = text.replace(
  String.raw`            if (cost < bestCost) {
              bestCost = cost
              bestD = roundedPath(shape as never, 10)
              if (cost === 0) break
            }`,
  String.raw`            if (cost < bestCost) {
              bestCost = cost
              bestD = roundedPath(shape as never, 10)
              const last = shape[shape.length - 1]!
              const before = shape[shape.length - 2] ?? last
              arrival = { x: last.x - before.x, y: last.y - before.y }
              if (cost === 0) break
            }`,
)

// 2) angle from `arrival`
const oldAngle = text.indexOf('        // Arrow direction: read it off the path that is actually drawn')
const endAngle = text.indexOf('        const angle = tailHint(bestD ?? \'\')')
if (oldAngle < 0 || endAngle < 0) {
  console.log('angle block missing')
  process.exit(1)
}
const replacement = String.raw`        // Arrow direction straight from the chosen geometry: a curve arrives along
        // end - control2, a polyline along its last leg. Parsing the path string got this
        // wrong for rounded corners, which is why arrows pointed sideways.
        const angle = Math.abs(arrival.x) < 0.5 && Math.abs(arrival.y) < 0.5
          ? (toSide === 'l' ? 180 : toSide === 'r' ? 0 : toSide === 't' ? -90 : 90)
          : Math.abs(arrival.x) >= Math.abs(arrival.y)
            ? (arrival.x >= 0 ? 0 : 180)
            : (arrival.y >= 0 ? 90 : -90)
        // The arrow head points the way the line travels: that is into the card.
        const arrowAngle = angle + 180
`
text = text.slice(0, oldAngle) + replacement + text.slice(endAngle + '        const angle = tailHint(bestD ?? \'\')'.length)

// 3) use arrowAngle when pushing the wire
text = text.replace("          angle,\n          from: link.from,", "          angle: arrowAngle,\n          from: link.from,")
fs.writeFileSync(file, text, 'utf8')
console.log('arrow angle patched')
