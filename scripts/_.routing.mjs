/**
 * Smarter face selection for an edge.
 *
 * Two cards that merely sit next to each other in the grid are ~12px apart, so an
 * r→l connection is a stub you cannot even see. The rule now:
 *   1. prefer the facing sides only when the gap between them is long enough to
 *      read as a line (MIN_SPAN);
 *   2. otherwise leave through the top or bottom face and come back in — a U that
 *      has real length;
 *   3. pick the free side (no card blocking within one card height), so the loop
 *      does not run straight through the neighbour underneath.
 */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

const old = J([
  '  const sideHandles = (from: Card, to: Card): { fromHandle: string; toHandle: string } => {',
  '    const dx = to.x - from.x',
  '    const dy = to.y - from.y',
  '    if (Math.abs(dx) >= Math.abs(dy)) {',
  "      return dx >= 0 ? { fromHandle: 'r', toHandle: 'l' } : { fromHandle: 'l', toHandle: 'r' }",
  '    }',
  "    return dy >= 0 ? { fromHandle: 'b', toHandle: 't' } : { fromHandle: 't', toHandle: 'b' }",
  '  }',
])
if (!source.includes(old)) {
  console.error('sideHandles anchor missing')
  process.exit(1)
}

const next = J([
  '  /** A line shorter than this reads as a stub, so we route around instead. */',
  '  const MIN_SPAN = 96',
  '',
  '  /** Is another card sitting directly below/above/right/left of `card`? */',
  '  const blockedToward = (card: Card, side: \'b\' | \'t\' | \'r\' | \'l\'): boolean => {',
  '    const span = side === \'b\' || side === \'t\' ? CARD_H : CARD_W',
  '    for (const other of Object.values(canvasState.cards)) {',
  '      if (other.boardId !== card.boardId) continue',
  '      if (other.sessionId === card.sessionId) continue',
  '      const dx = other.x - card.x',
  '      const dy = other.y - card.y',
  '      if (Math.abs(dx) > CARD_W * 1.05 || Math.abs(dy) > CARD_H * 1.05) continue',
  '      if (side === \'b\' && dy > 0 && dy < CARD_H * 1.15) return true',
  '      if (side === \'t\' && dy < 0 && -dy < CARD_H * 1.15) return true',
  '      if (side === \'r\' && dx > 0 && dx < CARD_W * 1.15) return true',
  '      if (side === \'l\' && dx < 0 && -dx < CARD_W * 1.15) return true',
  '      // Sideways neighbours also count for a vertical run.',
  '      if (span > 0 && (side === \'b\' || side === \'t\') && Math.abs(dx) < CARD_W * 0.9',
  '        && Math.abs(dy) < CARD_H * 1.15) return true',
  '    }',
  '    return false',
  '  }',
  '',
  '  /**',
  '   * Pick the faces an edge should use.',
  '   *',
  '   * Facing sides when there is room (that is the shortest readable line);',
  '   * otherwise leave through the free top/bottom (or left/right) face and come',
  '   * back in, so the line always has some length to look at.',
  '   */',
  '  const sideHandles = (from: Card, to: Card): { fromHandle: string; toHandle: string } => {',
  '    const dx = to.x - from.x',
  '    const dy = to.y - from.y',
  '    const gapX = Math.abs(dx) - CARD_W',
  '    const gapY = Math.abs(dy) - CARD_H',
  '    const horizontalDominant = Math.abs(dx) >= Math.abs(dy)',
  '',
  '    if (horizontalDominant) {',
  '      if (gapX >= MIN_SPAN) {',
  "        return dx >= 0 ? { fromHandle: 'r', toHandle: 'l' } : { fromHandle: 'l', toHandle: 'r' }",
  '      }',
  '      // Side by side and too tight: loop out of the free vertical face.',
  "      const fromSide = blockedToward(from, 'b') && !blockedToward(from, 't') ? 't' : 'b'",
  "      const toSide = blockedToward(to, 'b') && !blockedToward(to, 't') ? 't' : 'b'",
  '      // If both are blocked the loop is ugly either way; still avoid a stub.',
  '      return { fromHandle: fromSide, toHandle: toSide }',
  '    }',
  '',
  '    if (gapY >= MIN_SPAN) {',
  "      return dy >= 0 ? { fromHandle: 'b', toHandle: 't' } : { fromHandle: 't', toHandle: 'b' }",
  '    }',
  "    const fromSide = blockedToward(from, 'r') && !blockedToward(from, 'l') ? 'l' : 'r'",
  "    const toSide = blockedToward(to, 'r') && !blockedToward(to, 'l') ? 'l' : 'r'",
  '    return { fromHandle: fromSide, toHandle: toSide }',
  '  }',
])

source = source.replace(old, next)

// Use the computed faces for stored edges too: existing edges were created with
// the old "always r→l" rule, and they would keep their stub forever otherwise.
source = source.replace(
  J([
    '        // Handles stored per edge; legacy edges keep their old r→l anchoring.',
    "        sourceHandle: edge.fromHandle ?? 'r',",
    "        targetHandle: edge.toHandle ?? 'l',",
  ]),
  J([
    '        // Faces are recomputed from the live positions — a stored handle would',
    '        // keep a 12px stub forever after the cards were laid out side by side.',
    '        ...computedHandles(edge.fromCardId, edge.toCardId),',
  ]),
)

// Helper the edge list uses.
const helperAnchor = J(['  const liveEdges = useMemo<Edge[]>(() => {'])
source = source.replace(
  helperAnchor,
  J([
    '  /** Faces for a stored edge, from where its two cards are right now. */',
    '  const computedHandles = (fromCardId: string, toCardId: string): {',
    '    sourceHandle: string',
    '    targetHandle: string',
    '  } => {',
    '    const from = canvasState.cards[fromCardId]',
    '    const to = canvasState.cards[toCardId]',
    '    if (from === undefined || to === undefined) return { sourceHandle: \'r\', targetHandle: \'l\' }',
    '    const picked = sideHandles(from, to)',
    '    return { sourceHandle: picked.fromHandle, targetHandle: picked.toHandle }',
    '  }',
    '',
    helperAnchor,
  ]),
)

fs.writeFileSync(file, source, 'utf8')
console.log('routing: side-aware, minimum span')
