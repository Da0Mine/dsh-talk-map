/** Fix the waypoint curve: it must start at the source anchor (cubic with the waypoint as both controls). */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

const oldTry = String.raw`        const tryCurve = (
          control1: { x: number; y: number },
          control2: { x: number; y: number },
          waypoint: { x: number; y: number } | null,
        ): void => {
          const sample = (t: number) => {
            if (waypoint === null) {
              const u = 1 - t
              return {
                x: u * u * u * startPoint.x + 3 * u * u * t * control1.x + 3 * u * t * t * control2.x + t * t * t * endPoint.x,
                y: u * u * u * startPoint.y + 3 * u * u * t * control1.y + 3 * u * t * t * control2.y + t * t * t * endPoint.y,
              }
            }
            const u = 1 - t
            return {
              x: u * u * waypoint.x + 2 * u * t * control1.x + t * t * endPoint.x,
              y: u * u * waypoint.y + 2 * u * t * control1.y + t * t * endPoint.y,
            }
          }
          const cost = badness(sample)
          if (cost < bestCost) {
            bestCost = cost
            bestD = waypoint === null
              ? 'M ' + startPoint.x + ' ' + startPoint.y
                + ' C ' + control1.x + ' ' + control1.y + ', ' + control2.x + ' ' + control2.y
                + ', ' + endPoint.x + ' ' + endPoint.y
              : 'M ' + waypoint.x + ' ' + waypoint.y
                + ' Q ' + control1.x + ' ' + control1.y + ', ' + endPoint.x + ' ' + endPoint.y
          }
        }`

const newTry = String.raw`        const tryCurve = (
          control1: { x: number; y: number },
          control2: { x: number; y: number },
        ): void => {
          const u1 = (t: number) => (1 - t) * (1 - t) * (1 - t)
          const u2 = (t: number) => 3 * (1 - t) * (1 - t) * t
          const u3 = (t: number) => 3 * (1 - t) * t * t
          const u4 = (t: number) => t * t * t
          const sample = (t: number) => ({
            x: u1(t) * startPoint.x + u2(t) * control1.x + u3(t) * control2.x + u4(t) * endPoint.x,
            y: u1(t) * startPoint.y + u2(t) * control1.y + u3(t) * control2.y + u4(t) * endPoint.y,
          })
          const cost = badness(sample)
          if (cost < bestCost) {
            bestCost = cost
            bestD = 'M ' + startPoint.x + ' ' + startPoint.y
              + ' C ' + control1.x + ' ' + control1.y + ', ' + control2.x + ' ' + control2.y
              + ', ' + endPoint.x + ' ' + endPoint.y
          }
        }`

if (!text.includes(oldTry)) {
  console.log('tryCurve anchor missing')
  process.exit(1)
}
text = text.replace(oldTry, newTry)

const oldCall = String.raw`          for (const waypoint of waypoints) {
            tryCurve(
              { x: waypoint.x + (startPoint.x - waypoint.x) * 0.15, y: waypoint.y + (endPoint.y - waypoint.y) * 0.15 },
              waypoint,
              waypoint,
            )
            if (bestCost === 0) break
          }`
const newCall = String.raw`          for (const waypoint of waypoints) {
            // Both control points at the waypoint: the curve leaves along the normal,
            // sweeps through the waypoint area and comes into the target face.
            tryCurve(waypoint, waypoint)
            if (bestCost === 0) break
          }`
if (!text.includes(oldCall)) {
  console.log('call anchor missing')
  process.exit(1)
}
text = text.replace(oldCall, newCall)
text = text.replace("          tryCurve(c1, c2, null)", "          tryCurve(c1, c2)")
fs.writeFileSync(file, text, 'utf8')
console.log('waypoint curves fixed')
