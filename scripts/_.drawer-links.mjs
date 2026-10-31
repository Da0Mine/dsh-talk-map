/** Pass the drawer its connector links. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(D)

// A memo that maps the drawer's items to the edges among them.
const anchor = '  /** Faces for a stored edge, from where its two cards are right now. */'
if (!source.includes(anchor)) {
  console.error('anchor missing')
  process.exit(1)
}

const memo = J([
  '  /**',
  '   * Lines to draw inside a stack drawer: every edge whose two cards are both in',
  '   * that folder. Synced ones glow; the rest stay faint.',
  '   */',
  '  const drawerLinks = (cardIds: readonly string[]): { from: string; to: string; synced: boolean }[] => {',
  '    const present = new Set(cardIds)',
  '    return Object.values(canvasState.edges)',
  '      .filter(edge => present.has(edge.fromCardId) && present.has(edge.toCardId))',
  '      .map(edge => ({',
  '        from: edge.fromCardId,',
  '        to: edge.toCardId,',
  '        synced: edgeSyncState({',
  '          kind: edge.kind,',
  '          ...(edge.lastPushAt !== undefined ? { lastPushAt: edge.lastPushAt } : {}),',
  '          ...(sessions[canvasState.cards[edge.fromCardId]?.sessionId ?? \'\']?.updatedAt !== undefined',
  '            ? { sourceUpdatedAt: sessions[canvasState.cards[edge.fromCardId]?.sessionId ?? \'\']?.updatedAt }',
  '            : {}),',
  '        }) === \'synced\',',
  '      }))',
  '  }',
  '',
  anchor,
])
source = source.replace(anchor, memo)

// Hand them to the drawer.
source = source.replace(
  J(['              items={drawerItems(drawer.groupId)}']),
  J([
    '              items={drawerItems(drawer.groupId)}',
    '              links={drawerLinks(drawerItems(drawer.groupId).map(item => item.cardId))}',
  ]),
)

fs.writeFileSync(file, source, 'utf8')
console.log('canvas: drawer links passed')
