/** MapCanvas: feed links into drawerItems and implement the drawer reorder. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

// ---- 1. links per card inside drawerItems -----------------------------
source = source.replace(
  J([
    '        selected: batchMode ? batchPicks.has(cardId) : liveSelectedIds.has(cardId),',
    '        current: currentSessionId() === card.sessionId,',
    '      })',
  ]),
  J([
    '        selected: batchMode ? batchPicks.has(cardId) : liveSelectedIds.has(cardId),',
    '        current: currentSessionId() === card.sessionId,',
    '        // The grid draws these as lines; inside the drawer they have to be',
    '        // spelled out, otherwise a pushed digest looks like it came from nowhere.',
    '        links: folderLinks(groupId, cardId),',
    '      })',
  ]),
)

// ---- 2. the helper -----------------------------------------------------
const helperAnchor = J([
  '  const drawerItems = (groupId: string): StackEntry[] => {',
])
if (!source.includes(helperAnchor)) {
  console.error('drawerItems anchor missing')
  process.exit(1)
}
source = source.replace(
  helperAnchor,
  J([
    '  /** Edges that start or end at `cardId` and stay inside the same folder. */',
    '  const folderLinks = (groupId: string, cardId: string): NonNullable<StackEntry[\'links\']> => {',
    '    const out: NonNullable<StackEntry[\'links\']> = []',
    '    for (const edge of Object.values(canvasState.edges)) {',
    '      const other = edge.fromCardId === cardId',
    '        ? edge.toCardId',
    '        : edge.toCardId === cardId ? edge.fromCardId : undefined',
    '      if (other === undefined) continue',
    '      const otherSessionId = visibleCards[other]?.sessionId',
    '      if (otherSessionId === undefined) continue',
    '      if (sessionWs.get(otherSessionId) !== groupId) continue',
    '      out.push({',
    '        toCardId: other,',
    '        title: renamedTitles[otherSessionId] ?? sessions.byId[otherSessionId]?.displayTitle ?? otherSessionId,',
    "        kind: edge.injection?.kind ?? 'link',",
    '        outgoing: edge.fromCardId === cardId,',
    '      })',
    '    }',
    '    return out',
    '  }',
    '',
    helperAnchor,
  ]),
)

// ---- 3. reorder handler ------------------------------------------------
const reorderAnchor = J([
  '  /** Cards picked in batch mode (a plain click on a card toggles it). */',
])
if (!source.includes(reorderAnchor)) {
  console.error('reorder anchor missing')
  process.exit(1)
}
source = source.replace(
  reorderAnchor,
  J([
    '  /**',
    '   * A drag inside the stack drawer landed. The drawer shows the folder\'s',
    '   * reading order, which is derived from canvas positions — so the new',
    '   * arrangement is written back as slot coordinates, exactly like a canvas',
    '   * drop. Nothing is stored twice, so grid and drawer cannot disagree.',
    '   */',
    '  const reorderInDrawer = (groupId: string, cardId: string, index: number): void => {',
    '    const layout = folderLayouts[groupId]',
    '    const rect = frameRects[groupId] ?? wsFrames[groupId]',
    '    if (layout === undefined || rect === undefined) return',
    '    const ids = [...layout.ordered]',
    '    const from = ids.indexOf(cardId)',
    '    if (from < 0) return',
    '    ids.splice(from, 1)',
    '    const at = Math.min(Math.max(0, index), ids.length)',
    '    ids.splice(at, 0, cardId)',
    '    const cols = colsForWidth(rect.width)',
    '    ids.forEach((id, position) => {',
    '      const point = slotPoint(rect, position, cols)',
    '      canvas.moveCard(id, point.x, point.y)',
    '    })',
    '  }',
    '',
    reorderAnchor,
  ]),
)

// ---- 4. wire the prop --------------------------------------------------
source = source.replace(
  J([
    '              onOpenSession={(sessionId) => { openSearchHit(sessionId) }}',
  ]),
  J([
    '              onOpenSession={(sessionId) => { openSearchHit(sessionId) }}',
    '              onReorder={(cardId, index) => { reorderInDrawer(drawer.groupId, cardId, index) }}',
  ]),
)

fs.writeFileSync(file, source, 'utf8')
console.log('canvas: drawer links + reorder')
