/**
 * One edge menu, whichever kind of line it is.
 *
 * A lineage line used to offer only 推送 + 隐藏, while a drawn edge offered
 * 推送 + 自动推送 + 删除 — same-looking lines, different menus, which reads as a
 * bug. Now both offer the same three things; on a lineage line 「开启自动推送」
 * first materialises a real edge (the derived line then yields to it, as the
 * explicit pair already wins over lineage), so auto push has somewhere to live.
 */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

// ---- 1. a helper that makes a real edge out of a derived pair ----------
const helperAnchor = J([
  '  const pushAlongEdge = async (fromCardId: string, toCardId: string): Promise<void> => {',
])
if (!source.includes(helperAnchor)) {
  console.error('pushAlongEdge anchor missing')
  process.exit(1)
}
source = source.replace(
  helperAnchor,
  J([
    '  /**',
    '   * Give a derived pair a real edge so it can carry per-edge settings',
    '   * (auto push, handles). The lineage line yields automatically: the canvas',
    '   * already skips a derived line when a stored edge covers that pair.',
    '   */',
    '  const materialiseEdge = (fromCardId: string, toCardId: string): string | undefined => {',
    '    const fromCard = canvasState.cards[fromCardId]',
    '    const toCard = canvasState.cards[toCardId]',
    '    if (fromCard === undefined || toCard === undefined) return undefined',
    '    const geometry = sideHandles(fromCard, toCard)',
    '    const fromTitle = sessions.byId[fromCard.sessionId]?.displayTitle',
    '    const edgeId = `edge-${crypto.randomUUID()}`',
    '    canvas.addEdges({',
    '      [edgeId]: {',
    '        boardId: INBOX_BOARD_ID,',
    '        fromCardId,',
    '        toCardId,',
    "        injection: { kind: 'digest' },",
    '        fromHandle: geometry.fromHandle,',
    '        toHandle: geometry.toHandle,',
    '        ...(fromTitle !== undefined ? { fromTitle } : {}),',
    '        createdAt: Date.now(),',
    '      },',
    '    })',
    '    return edgeId',
    '  }',
    '',
    helperAnchor,
  ]),
)

// ---- 2. shared menu: auto push works on both --------------------------
const oldBranch = J([
  '      if (stored === undefined) {',
  '        // A derived lineage line: nothing to push along, nothing to delete.',
  '        items.push({',
  "          key: 'lineage-info',",
  "          label: t('edge.lineageTitle'),",
  "          hint: t('edge.lineageHint'),",
  '          disabled: true,',
  '        })',
  '        items.push({',
  "          key: 'hide-lineage',",
  "          label: t('edge.hideLineage'),",
  '          onPick: () => {',
  '            close()',
  '            setLineageHidden(true)',
  '          },',
  '        })',
  '      }',
  '      items.push({',
  "        key: 'push',",
  "        label: t('edge.push'),",
  "        ...(stored === undefined ? { hint: t('edge.lineageHint') } : {}),",
  "        ...(noDigest ? { hint: t('edge.pushNoDigest'), disabled: true } : {}),",
  '        onPick: () => {',
  '          close()',
  '          void pushAlongEdge(edgeFrom, edgeTo)',
  '        },',
  '      })',
  '      if (stored !== undefined) {',
  '        const auto = stored.injection.autoPush === true',
  '        items.push({',
  "          key: 'auto-push',",
  "          label: auto ? t('edge.autoPushOff') : t('edge.autoPushOn'),",
  "          ...(auto ? {} : { hint: t('edge.autoPushHint') }),",
  '          onPick: () => {',
  '            close()',
  '            canvas.addEdges({',
  '              [edgeId]: {',
  '                ...stored,',
  '                injection: { ...stored.injection, autoPush: !auto },',
  '              },',
  '            })',
  '          },',
  '        })',
  '      }',
])
if (!source.includes(oldBranch)) {
  console.error('menu branch missing')
  process.exit(1)
}

const newBranch = J([
  '      const lineage = stored === undefined',
  '      // Say what this line is, whichever kind it is.',
  '      if (lineage) {',
  '        items.push({',
  "          key: 'lineage-info',",
  "          label: t('edge.lineageTitle'),",
  "          hint: t('edge.lineageHint'),",
  '          disabled: true,',
  '        })',
  '      }',
  '      items.push({',
  "        key: 'push',",
  "        label: t('edge.push'),",
  "        ...(noDigest ? { hint: t('edge.pushNoDigest'), disabled: true } : {}),",
  '        onPick: () => {',
  '          close()',
  '          void pushAlongEdge(edgeFrom, edgeTo)',
  '        },',
  '      })',
  '      // Same switch on both kinds: a lineage line materialises a real edge first',
  '      // (its derived line then yields), so the control is never missing.',
  '      const auto = stored?.injection.autoPush === true',
  '      items.push({',
  "        key: 'auto-push',",
  "        label: auto ? t('edge.autoPushOff') : t('edge.autoPushOn'),",
  "        ...(auto ? {} : { hint: t('edge.autoPushHint') }),",
  '        onPick: () => {',
  '          close()',
  '          if (stored !== undefined) {',
  '            canvas.addEdges({',
  '              [edgeId]: {',
  '                ...stored,',
  '                injection: { ...stored.injection, autoPush: !auto },',
  '              },',
  '            })',
  '            return',
  '          }',
  '          const created = materialiseEdge(edgeFrom, edgeTo)',
  '          if (created === undefined) return',
  "          showToast(t('edge.lineageMaterialised'))",
  '        },',
  '      })',
  '      if (lineage) {',
  '        items.push({',
  "          key: 'hide-lineage',",
  "          label: t('edge.hideLineage'),",
  '          onPick: () => {',
  '            close()',
  '            setLineageHidden(true)',
  '          },',
  '        })',
  '      }',
])
source = source.replace(oldBranch, newBranch)

fs.writeFileSync(file, source, 'utf8')
console.log('edge menu unified')
