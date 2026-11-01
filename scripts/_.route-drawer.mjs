/**
 * Drawer wires: route them with the same obstacle-avoiding router as the map, so
 * a line between two drawer cards goes through the gap instead of across another
 * card's body.
 */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const before = source

// imports: drop the smoothstep helper, add the router + face picker
source = source.replace(
  "import { getSmoothStepPath, Position } from '@xyflow/react'" + D,
  "import { routeEdge, roundedPath } from './edge-route.ts'" + D + "import { pickFaces } from './edge-routing.ts'" + D,
)

const lines = source.split(/\r?\n/)
const startAt = lines.findIndex(line => line.includes('const fromCx = from.x + from.width / 2'))
const endAt = lines.findIndex((line, index) => index > startAt && line.includes('next.push({ d: wirePath, ax: targetX, ay: targetY, angle })'))
if (startAt < 0 || endAt < 0) {
  console.error('geometry block not found')
  process.exit(1)
}

const block = [
  '        // Same rule and the same geometry as the map: faces from the shared',
  '        // rule, path from the obstacle-avoiding router (gap centres, not card',
  '        // bodies).',
  '        const rectOf = (box: DOMRect) => ({ x: box.x, y: box.y, w: box.width, h: box.height })',
  '        const fromRect = rectOf(from)',
  '        const toRect = rectOf(to)',
  '        const obstacles = cardsInDrawer',
  '          .filter(card => card.id !== link.from && card.id !== link.to)',
  '          .map(rectOf)',
  '        const faces = pickFaces(',
  '          { id: link.from, x: fromRect.x, y: fromRect.y },',
  '          { id: link.to, x: toRect.x, y: toRect.y },',
  '          cardsInDrawer.map(card => ({ id: card.id, x: card.x, y: card.y })),',
  '          { cardWidth: fromRect.w, cardHeight: fromRect.h },',
  '        )',
  '        const points = routeEdge(',
  '          fromRect,',
  '          toRect,',
  '          faces.fromHandle as \'t\' | \'r\' | \'b\' | \'l\',',
  '          faces.toHandle as \'t\' | \'r\' | \'b\' | \'l\',',
  '          [fromRect, toRect, ...obstacles],',
  '        )',
  '        const tip = points[points.length - 1]',
  '        const prev = points[points.length - 2]',
  '        const angle = Math.abs(tip.x - prev.x) >= Math.abs(tip.y - prev.y)',
  '          ? (tip.x >= prev.x ? 0 : 180)',
  '          : (tip.y >= prev.y ? 90 : -90)',
  '        next.push({ d: roundedPath(points, 8), ax: tip.x, ay: tip.y, angle })',
]

lines.splice(startAt, endAt - startAt + 1, ...block)

// `cardsInDrawer` must exist: measure every drawn card once per pass.
const insertAt = lines.findIndex(line => line.includes('const next: { d: string; ax: number; ay: number; angle: number }[] = []'))
if (insertAt < 0) {
  console.error('next-block marker not found')
  process.exit(1)
}
lines.splice(insertAt, 0,
  '      // Every drawn card, as a routing obstacle and as geometry for pickFaces.',
  '      const cardsInDrawer = [...scroller.querySelectorAll(\'[data-card-id]\')]',
  '        .map(element => {',
  '          const box = element.getBoundingClientRect()',
  '          const base = scroller.getBoundingClientRect()',
  '          return {',
  '            id: element.getAttribute(\'data-card-id\') ?? \'\',',
  '            x: box.left - base.left + scroller.scrollLeft,',
  '            y: box.top - base.top + scroller.scrollTop,',
  '            w: box.width,',
  '            h: box.height,',
  '          }',
  '        })',
)

source = lines.join(D)
if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('drawer: uses the router')
