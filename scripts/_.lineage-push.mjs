/** Lineage pushes: stamp the pair, and read it in both edge paths. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

// ---- 1. import ---------------------------------------------------------
source = source.replace(
  "import { edgeSyncState, lineageSyncState } from './edge-sync.ts'",
  "import { edgeSyncState, lineageSyncState } from './edge-sync.ts'" + EOL + "import { lastPushFor, stampPush } from './push-log.ts'",
)

// ---- 2. pushAlongEdge stamps the pair (works for lineage lines too) ----
const oldStamp = J([
  '      // Remember when this line last delivered: "synced" is decided from it.',
  '      const pushedAt = Date.now()',
  '      for (const [id, edge] of Object.entries(canvasState.edges)) {',
  '        const same = (edge.fromCardId === fromCardId && edge.toCardId === toCardId)',
  '          || (edge.fromCardId === toCardId && edge.toCardId === fromCardId)',
  '        if (!same) continue',
  '        canvas.addEdges({ [id]: { ...edge, lastPushAt: pushedAt } })',
  '      }',
])
const newStamp = J([
  '      // Remember when this line last delivered: "synced" is decided from it.',
  '      // The record is keyed by the card PAIR, so a lineage line (which has no',
  '      // stored edge to write to) keeps its state too.',
  '      const pushedAt = stampPush(fromCardId, toCardId)',
  '      for (const [id, edge] of Object.entries(canvasState.edges)) {',
  '        const same = (edge.fromCardId === fromCardId && edge.toCardId === toCardId)',
  '          || (edge.fromCardId === toCardId && edge.toCardId === fromCardId)',
  '        if (!same) continue',
  '        canvas.addEdges({ [id]: { ...edge, lastPushAt: pushedAt } })',
  '      }',
])
if (!source.includes(oldStamp)) {
  console.error('stamp anchor missing')
  process.exit(1)
}
source = source.replace(oldStamp, newStamp)

// ---- 3. stored edges: fall back to the pair log -----------------------
source = source.replace(
  J([
    '      const sync = edgeSyncState({',
    '        kind,',
    "        ...(typeof edge.lastPushAt === 'number' ? { lastPushAt: edge.lastPushAt } : {}),",
  ]),
  J([
    '      const sync = edgeSyncState({',
    '        kind,',
    '        ...(lastPushOf(edge.fromCardId, edge.toCardId) !== undefined',
    '          ? { lastPushAt: lastPushOf(edge.fromCardId, edge.toCardId) }',
    '          : {}),',
  ]),
)

// ---- 4. a helper that prefers the stored stamp -----------------------
const helperAnchor = J([
  '  /** `updatedAt` of the session behind a card (undefined when it is gone). */',
])
if (!source.includes(helperAnchor)) {
  console.error('helper anchor missing')
  process.exit(1)
}
source = source.replace(
  helperAnchor,
  J([
    '  /** Last delivery for a card pair: the edge\'s own stamp, else the push log. */',
    '  const lastPushOf = (fromCardId: string, toCardId: string): number | undefined => {',
    '    for (const edge of Object.values(canvasState.edges)) {',
    '      const same = (edge.fromCardId === fromCardId && edge.toCardId === toCardId)',
    '        || (edge.fromCardId === toCardId && edge.toCardId === fromCardId)',
    "      if (same && typeof edge.lastPushAt === 'number') return edge.lastPushAt",
    '    }',
    '    return lastPushFor(fromCardId, toCardId)',
    '  }',
    '',
    helperAnchor,
  ]),
)

// ---- 5. lineage lines use the same source ----------------------------
source = source.replace(
  J([
    '      const lineageSync = lineageSyncState({',
    '        ...(parentSession?.updatedAt !== undefined ? { parentUpdatedAt: parentSession.updatedAt } : {}),',
    '        ...(childSession?.updatedAt !== undefined ? { childUpdatedAt: childSession.updatedAt } : {}),',
    '      })',
  ]),
  J([
    '      // A lineage line can be pushed along too (the menu offers 推送摘要 on it),',
    '      // so the pair log decides: pushed after the parent changed → synced.',
    '      const lineagePush = lastPushOf(parentCardId, cardId)',
    '      const lineageSync = lineagePush !== undefined',
    '        ? edgeSyncState({',
    "            kind: 'digest',",
    '            lastPushAt: lineagePush,',
    '            ...(parentSession?.updatedAt !== undefined ? { sourceUpdatedAt: parentSession.updatedAt } : {}),',
    '          })',
    '        : lineageSyncState({',
    '            ...(parentSession?.updatedAt !== undefined ? { parentUpdatedAt: parentSession.updatedAt } : {}),',
    '            ...(childSession?.updatedAt !== undefined ? { childUpdatedAt: childSession.updatedAt } : {}),',
    '          })',
  ]),
)

fs.writeFileSync(file, source, 'utf8')
console.log('lineage pushes recorded')
