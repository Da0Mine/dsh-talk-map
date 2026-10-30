/**
 * Lineage lines (a fork/subagent whose parent is also on the board) are drawn
 * from session provenance, not from a stored edge — so they had no sync state and
 * looked "dead" next to an animated injection line.
 *
 * They are not a channel: nothing is ever pushed along them. But the reader still
 * needs to know whether the child is current with its parent, so they get the same
 * three states, computed from the two sessions' timestamps:
 *   synced — the child has been updated at or after the parent (it took the fork
 *            and has kept up);
 *   stale  — the parent moved on after the child's last change;
 *   far    — and that gap is old.
 */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

// ---- 1. edge-sync: a lineage helper ------------------------------------
let sync = fs.readFileSync('src/client/edge-sync.ts', 'utf8')
sync += J([
  '',
  '/**',
  ' * Freshness of a lineage line (parent session → forked/subagent child).',
  ' * Nothing is pushed along it; this only says whether the child has kept up.',
  ' */',
  'export function lineageSyncState(input: {',
  '  parentUpdatedAt?: number',
  '  childUpdatedAt?: number',
  '  now?: number',
  '}): EdgeSyncState {',
  '  const parent = Number(input.parentUpdatedAt)',
  '  const child = Number(input.childUpdatedAt)',
  '  if (!Number.isFinite(parent) || !Number.isFinite(child)) return \'idle\'',
  '  // The child was written to at or after the parent: it has the latest state.',
  '  if (child + SAME_MOMENT_MS >= parent) return \'synced\'',
  '  const now = Number(input.now ?? Date.now())',
  '  return now - child >= FAR_BEHIND_MS ? \'far\' : \'stale\'',
  '}',
  '',
])
fs.writeFileSync('src/client/edge-sync.ts', sync, 'utf8')

// ---- 2. canvas: give lineage lines a state ----------------------------
source = source.replace(
  "import { edgeSyncState } from './edge-sync.ts'",
  "import { edgeSyncState, lineageSyncState } from './edge-sync.ts'",
)

const lineageAnchor = J([
  '      if (explicitPairs.has(`${parentCardId}->${cardId}`)) continue',
  '      out.push({',
  '        id: `lineage-${parentCardId}-${cardId}`,',
  '        source: parentCardId,',
  '        target: cardId,',
  "        sourceHandle: 'r',",
  "        targetHandle: 'l',",
  "        type: 'smoothstep',",
  '        selectable: false,',
  '        data: { fromCardId: parentCardId, toCardId: cardId },',
  "        style: { strokeDasharray: '6 4', opacity: 0.5 },",
  '      })',
])
if (!source.includes(lineageAnchor)) {
  console.error('lineage anchor missing')
  process.exit(1)
}
source = source.replace(
  lineageAnchor,
  J([
    '      if (explicitPairs.has(`${parentCardId}->${cardId}`)) continue',
    '      // Provenance, not a channel: the child inherited the history and has',
    '      // to be judged by its own timestamps.',
    '      const parentSession = sessions.byId[visibleCards[parentCardId]?.sessionId ?? \'\']',
    '      const childSession = sessions.byId[card.sessionId]',
    '      const lineageSync = lineageSyncState({',
    '        ...(parentSession?.updatedAt !== undefined ? { parentUpdatedAt: parentSession.updatedAt } : {}),',
    '        ...(childSession?.updatedAt !== undefined ? { childUpdatedAt: childSession.updatedAt } : {}),',
    '      })',
    '      out.push({',
    '        id: `lineage-${parentCardId}-${cardId}`,',
    '        source: parentCardId,',
    '        target: cardId,',
    "        sourceHandle: 'r',",
    "        targetHandle: 'l',",
    "        type: 'smoothstep',",
    '        selectable: false,',
    '        className: `tmEdge tmEdge-${lineageSync}`',
    '          + (lineageSync === \'idle\' ? \' tmEdge-lineage\' : \'\'),',
    '        data: { fromCardId: parentCardId, toCardId: cardId },',
    "        style: { strokeDasharray: '6 4', opacity: 0.5 },",
    '      })',
  ]),
)

// ---- 3. dependency list: recompute when timestamps move ----------------
source = source.replace(
  '  }, [visibleCards, canvasState.edges, sessions, sessionIdToCardId, liveSelectedEdgeIds, foldedSet, locale])',
  '  }, [visibleCards, canvasState.edges, sessions, sessionIdToCardId, liveSelectedEdgeIds, foldedSet, locale])',
)

fs.writeFileSync(file, source, 'utf8')
console.log('lineage lines get a sync state')
