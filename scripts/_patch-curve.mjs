/** Splice the curve-based wire routing into StackDrawer (lines 289..375, 1-based). */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const block = String.raw`        // A curve, not an orthogonal route. The drawer's grid is dense, and forcing the line
        // to run in the gutters produced long detours and the odd wrap. What is wanted is
        // the simplest visible connection: a smooth curve between the two facing edges that
        // does not overlap a card and stays inside the panel.
        const sideOf = (
          rect: { x: number; y: number; w: number; h: number },
          other: { x: number; y: number; w: number; h: number },
        ): 't' | 'r' | 'b' | 'l' => {
          const dx = (other.x + other.w / 2) - (rect.x + rect.w / 2)
          const dy = (other.y + other.h / 2) - (rect.y + rect.h / 2)
          if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'r' : 'l'
          return dy >= 0 ? 'b' : 't'
        }
        const anchorOf = (rect: { x: number; y: number; w: number; h: number }, side: 't' | 'r' | 'b' | 'l') =>
          side === 't' ? { x: rect.x + rect.w / 2, y: rect.y }
            : side === 'b' ? { x: rect.x + rect.w / 2, y: rect.y + rect.h }
              : side === 'l' ? { x: rect.x, y: rect.y + rect.h / 2 }
                : { x: rect.x + rect.w, y: rect.y + rect.h / 2 }
        const normalOf = (side: 't' | 'r' | 'b' | 'l') =>
          side === 't' ? { x: 0, y: -1 } : side === 'b' ? { x: 0, y: 1 }
            : side === 'l' ? { x: -1, y: 0 } : { x: 1, y: 0 }

        const fromSide = sideOf(fromRect, toRect)
        const toSide = sideOf(toRect, fromRect)
        const startPoint = anchorOf(fromRect, fromSide)
        const endPoint = anchorOf(toRect, toSide)
        const startNormal = normalOf(fromSide)
        const endNormal = normalOf(toSide)
        const span = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)

        /** Sampled points that sit inside a card or outside the panel. */
        const badness = (sample: (t: number) => { x: number; y: number }): number => {
          let bad = 0
          for (let step = 0; step <= 40; step += 1) {
            const point = sample(step / 40)
            if (point.x < 6 || point.y < 6 || point.x > boundsWidth - 6 || point.y > boundsHeight - 6) bad += 1
            for (const card of cardsInDrawer) {
              if (point.x <= card.x + 2 || point.x >= card.x + card.w - 2) continue
              if (point.y <= card.y + 2 || point.y >= card.y + card.h - 2) continue
              const own = card.id === link.from || card.id === link.to
              const nearStart = Math.hypot(point.x - startPoint.x, point.y - startPoint.y) < 18
              const nearEnd = Math.hypot(point.x - endPoint.x, point.y - endPoint.y) < 18
              if (own && (nearStart || nearEnd)) continue
              bad += 1
            }
          }
          return bad
        }

        // Candidates: straight-ish first, then progressively bowing out along the face
        // normals. The first clean one wins; ties go to the smaller bow.
        let bestD: string | undefined
        let bestCost = Number.POSITIVE_INFINITY
        for (const bow of [0.15, 0.3, 0.5, 0.75, 1.1]) {
          const reach = Math.max(18, span * bow)
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
        }
        const angle = toSide === 'l' ? 180 : toSide === 'r' ? 0 : toSide === 't' ? -90 : 90
        next.push({
          d: bestD ?? ('M ' + startPoint.x + ' ' + startPoint.y + ' L ' + endPoint.x + ' ' + endPoint.y),
          ax: endPoint.x,
          ay: endPoint.y,
          angle,
          from: link.from,
          to: link.to,
        })`

// Replace 1-based lines 289..375
const start = 289 - 1
const end = 375 - 1
const out = [...lines.slice(0, start), block, ...lines.slice(end + 1)]
fs.writeFileSync(file, out.join('\n'), 'utf8')
console.log('patched', lines.length, '->', out.length)
