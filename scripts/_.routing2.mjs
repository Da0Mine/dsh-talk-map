/** MapCanvas: use the tested routing module instead of the inline block. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)
const before = source

// 1) import
if (!source.includes("from './edge-routing.ts'")) {
  source = source.replace(
    "import { edgeSyncState, lineageSyncState } from './edge-sync.ts'",
    "import { edgeSyncState, lineageSyncState } from './edge-sync.ts'" + EOL + "import { pickFaces, type Obstacle } from './edge-routing.ts'",
  )
}

// 2) replace the inline hooks (MIN_SPAN + blockedToward + sideHandles) with a thin wrapper
const start = source.indexOf('  /** A line shorter than this reads as a stub, so we route around instead. */')
if (start < 0) {
  console.error('inline routing block missing')
  process.exit(1)
}
const endMarker = J(['  ', '  /** A plain association between two existing cards.'])
const end = source.indexOf(endMarker, start)
const endFallback = source.indexOf('  /** A plain association between two existing cards.', start)
const stop = end > start ? end : endFallback
if (stop <= start) {
  console.error('routing block end missing')
  process.exit(1)
}

const replacement = J([
  '  /** Every card on this board, as routing obstacles. */',
  '  const routingObstacles = (): Obstacle[] => Object.entries(canvasState.cards).map(([id, card]) => ({',
  '    id,',
  '    x: card.x,',
  '    y: card.y,',
  '  }))',
  '',
  '  /** Faces for a pair — see edge-routing.ts for the rules. */',
  '  const sideHandles = (fromCardId: string, toCardId: string): { fromHandle: string; toHandle: string } => {',
  '    const from = canvasState.cards[fromCardId]',
  '    const to = canvasState.cards[toCardId]',
  "    if (from === undefined || to === undefined) return { fromHandle: 'r', toHandle: 'l' }",
  '    const picked = pickFaces(',
  '      { id: fromCardId, x: from.x, y: from.y },',
  '      { id: toCardId, x: to.x, y: to.y },',
  '      routingObstacles(),',
  '      { cardWidth: CARD_W, cardHeight: CARD_H },',
  '    )',
  '    return { fromHandle: picked.fromHandle, toHandle: picked.toHandle }',
  '  }',
  '',
  '',
])
source = source.slice(0, start) + replacement + source.slice(stop)

// 3) callers: sideHandles now takes ids
source = source.replace('const geometry = sideHandles(fromCard, toCard)', 'const geometry = sideHandles(fromCardId, toCardId)')
source = source.replace(
  J([
    '    const picked = sideHandles(from, to)',
    '    return { sourceHandle: picked.fromHandle, targetHandle: picked.toHandle }',
  ]),
  J([
    '    const picked = sideHandles(fromCardId, toCardId)',
    '    return { sourceHandle: picked.fromHandle, targetHandle: picked.toHandle }',
  ]),
)

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('canvas switched to the routing module')
