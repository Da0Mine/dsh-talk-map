/** Add curved detour candidates (via a waypoint outside the pair) to the drawer wires. */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let text = fs.readFileSync(file, 'utf8')

const oldBlock = String.raw`        // Candidates: straight-ish first, then progressively bowing out along the face
        // normals. The first clean one wins; ties go to the smaller bow.
        let bestD: string | undefined
        let bestCost = Number.POSITIVE_INFINITY
        for (const bow of [0.15, 0.3, 0.5, 0.75, 1.1]) {`

const newBlock = String.raw`        // Candidates, in order of how "direct" they look:
        //   1. a curve that bows out along the face normals (works for neighbours),
        //   2. a curve that goes round the pair through a waypoint above / below /
        //      left / right (needed when another card sits between the two).
        let bestD: string | undefined
        let bestCost = Number.POSITIVE_INFINITY
        const tryCurve = (
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
        }

        for (const bow of [0.15, 0.3, 0.5, 0.75, 1.1]) {`

if (!text.includes(oldBlock)) {
  console.log('anchor missing')
  process.exit(1)
}
text = text.replace(oldBlock, newBlock)

// Rewrite the bow loop body to call tryCurve, and append the waypoint candidates.
const oldBody = String.raw`          const reach = Math.max(18, span * bow)
          const c1 = { x: startPoint.x + startNormal.x * reach, y: startPoint.y + startNormal.y * reach }
          const c2 = { x: endPoint.x + endNormal.x * reach, y: endPoint.y + endNormal.y * reach }
          const sample = (t: number) => {
            const u = 1 - t
            return {
              x: u * u * u * startPoint.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * endPoint.x,
              y: u * u * u * startPoint.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * endPoint.y,
            }
          }
          const cost = badness(sample)
          if (cost < bestCost) {
            bestCost = cost
            bestD = 'M ' + startPoint.x + ' ' + startPoint.y
              + ' C ' + c1.x + ' ' + c1.y + ', ' + c2.x + ' ' + c2.y
              + ', ' + endPoint.x + ' ' + endPoint.y
            if (cost === 0) break
          }
        }`

const newBody = String.raw`          const reach = Math.max(18, span * bow)
          const c1 = { x: startPoint.x + startNormal.x * reach, y: startPoint.y + startNormal.y * reach }
          const c2 = { x: endPoint.x + endNormal.x * reach, y: endPoint.y + endNormal.y * reach }
          tryCurve(c1, c2, null)
          if (bestCost === 0) break
        }

        // Detours: a waypoint clear of both cards, clamped inside the panel.
        if (bestCost > 0) {
          const pad = 10
          const pairTop = Math.min(fromRect.y, toRect.y)
          const pairBottom = Math.max(fromRect.y + fromRect.h, toRect.y + toRect.h)
          const pairLeft = Math.min(fromRect.x, toRect.x)
          const pairRight = Math.max(fromRect.x + fromRect.w, toRect.x + toRect.w)
          const midX = (startPoint.x + endPoint.x) / 2
          const midY = (startPoint.y + endPoint.y) / 2
          const waypoints = [
            { x: midX, y: Math.max(pad, pairTop - 16) },
            { x: midX, y: Math.min(boundsHeight - pad, pairBottom + 16) },
            { x: Math.max(pad, pairLeft - 16), y: midY },
            { x: Math.min(boundsWidth - pad, pairRight + 16), y: midY },
          ]
          for (const waypoint of waypoints) {
            tryCurve(
              { x: waypoint.x + (startPoint.x - waypoint.x) * 0.15, y: waypoint.y + (endPoint.y - waypoint.y) * 0.15 },
              waypoint,
              waypoint,
            )
            if (bestCost === 0) break
          }
        }`

if (!text.includes(oldBody)) {
  console.log('body anchor missing')
  process.exit(1)
}
text = text.replace(oldBody, newBody)
fs.writeFileSync(file, text, 'utf8')
console.log('curve detours added')
