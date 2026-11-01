/** Wire the obstacle-avoiding router into the canvas. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(D)
const before = source

// 1) import
if (!source.includes("from './edge-route.ts'")) {
  source = source.replace(
    "import { pickFaces, type Obstacle } from './edge-routing.ts'",
    "import { pickFaces, type Obstacle } from './edge-routing.ts'" + D + "import { routeEdge, type Point as RoutePoint } from './edge-route.ts'",
  )
}

// 2) routeFor(): every painted card is an obstacle for every other line
const anchor = J(['  /** Faces for a stored edge, from where its two cards are right now. */'])
if (!source.includes(anchor)) {
  console.error('anchor missing')
  process.exit(1)
}

const helper = J([
  '  /**',
  '   * Waypoints for one edge, routed around every other painted card.',
  '   *',
  '   * Faces come from the same rule as before; the path between them is now an',
  '   * orthogonal search over the gaps, so a line never crosses a card and prefers',
  '   * the middle of the gap it travels through.',
  '   */',
  '  const routeFor = (fromCardId: string, toCardId: string): RoutePoint[] => {',
  '    const fromCard = canvasState.cards[fromCardId]',
  '    const toCard = canvasState.cards[toCardId]',
  '    if (fromCard === undefined || toCard === undefined) return []',
  '    const faces = sideHandles(fromCardId, toCardId)',
  '    const fromRect = { x: fromCard.x, y: fromCard.y, w: CARD_W, h: CARD_H }',
  '    const toRect = { x: toCard.x, y: toCard.y, w: CARD_W, h: CARD_H }',
  '    const others = Object.entries(canvasState.cards)',
  '      .filter(([id]) => id !== fromCardId && id !== toCardId)',
  '      // A folded card is not painted, so it must not push lines around either.',
  '      .filter(([id]) => !foldedSet.has(id))',
  '      .map(([, card]) => ({ x: card.x, y: card.y, w: CARD_W, h: CARD_H }))',
  '    return routeEdge(',
  '      fromRect,',
  '      toRect,',
  '      faces.fromHandle as \'t\' | \'r\' | \'b\' | \'l\',',
  '      faces.toHandle as \'t\' | \'r\' | \'b\' | \'l\',',
  '      [fromRect, toRect, ...others],',
  '    )',
  '  }',
  '',
  anchor,
])
source = source.replace(anchor, helper)

// 3) stored edges carry their route
const storedData = "        data: { fromCardId: edge.fromCardId, toCardId: edge.toCardId, sync },"
if (!source.includes(storedData)) {
  console.error('stored data line missing')
  process.exit(1)
}
source = source.replace(
  storedData,
  J([
    '        data: {',
    '          fromCardId: edge.fromCardId,',
    '          toCardId: edge.toCardId,',
    '          sync,',
    '          route: routeFor(edge.fromCardId, edge.toCardId),',
    '        },',
  ]),
)

// 4) lineage edges too
const lineageData = "        data: { fromCardId: parentCardId, toCardId: cardId, sync: lineageSync, structural: true },"
if (!source.includes(lineageData)) {
  console.error('lineage data line missing')
  process.exit(1)
}
source = source.replace(
  lineageData,
  J([
    '        data: {',
    '          fromCardId: parentCardId,',
    '          toCardId: cardId,',
    '          sync: lineageSync,',
    '          structural: true,',
    '          route: routeFor(parentCardId, cardId),',
    '        },',
  ]),
)

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('canvas: routes wired')
