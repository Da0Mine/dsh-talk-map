/**
 * Canvas side: hand the renderer the obstacle list instead of pre-computed
 * waypoints, because only the renderer knows the real handle positions.
 */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const before = source

// 1) routeFor → obstaclesFor
const start = source.indexOf('  /**\n   * Waypoints for one edge, routed around every other painted card.')
const startCrlf = source.indexOf('  /**\r\n   * Waypoints for one edge, routed around every other painted card.')
const at = start >= 0 ? start : startCrlf
if (at < 0) {
  console.error('routeFor helper not found')
  process.exit(1)
}
const endMarker = '    )\n  }\n'
const endAt = source.indexOf(endMarker, at)
const endAtCrlf = source.indexOf('    )\r\n  }\r\n', at)
const stop = endAtCrlf > 0 ? endAtCrlf + '    )\r\n  }\r\n'.length : endAt + endMarker.length
if (stop <= at) {
  console.error('routeFor end not found')
  process.exit(1)
}

const helper = [
  '  /**',
  '   * Cards the line must not cross, in flow coordinates.',
  '   *',
  '   * A card grows with its content (the stylesheet only sets a min-height), so the',
  '   * box reserves a little extra height — otherwise a line shaves the bottom of a',
  '   * taller neighbour. The renderer anchors the line on the real handles and does',
  '   * the routing itself.',
  '   */',
  '  const obstaclesFor = (fromCardId: string, toCardId: string): { x: number; y: number; w: number; h: number }[] =>',
  '    Object.entries(canvasState.cards)',
  '      .filter(([id]) => id !== fromCardId && id !== toCardId)',
  '      // A folded card is not painted, so it must not push lines around either.',
  '      .filter(([id]) => !foldedSet.has(id))',
  '      .map(([, card]) => ({ x: card.x, y: card.y, w: CARD_W, h: CARD_H + 16 }))',
  '',
].join(D)

source = source.slice(0, at) + helper + source.slice(stop)

// 2) data: route → obstacles (stored edges)
source = source.replace(
  '          route: routeFor(edge.fromCardId, edge.toCardId),',
  '          obstacles: obstaclesFor(edge.fromCardId, edge.toCardId),',
)

// 3) data: route → obstacles (lineage edges)
source = source.replace(
  '          route: routeFor(parentCardId, cardId),',
  '          obstacles: obstaclesFor(parentCardId, cardId),',
)

// 4) drop the now-unused import
source = source.replace(
  "import { routeEdge, type Point as RoutePoint } from './edge-route.ts'" + D,
  '',
)

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('canvas: obstacle lists wired')
