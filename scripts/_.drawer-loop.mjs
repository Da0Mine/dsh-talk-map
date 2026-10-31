/**
 * Stop the drawer-wire update loop (React #185).
 *
 * The canvas passed `links={drawerLinks(...)}` — a brand new array on every
 * render — and the measuring effect set state, so each pass re-armed it forever.
 * Fix both ends: memoise the list, and only set state when the paths changed.
 */
import fs from 'node:fs'

// ------------------------------------------------------------------ drawer ---
const drawerFile = 'src/client/StackDrawer.tsx'
let drawer = fs.readFileSync(drawerFile, 'utf8')
const D = drawer.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(D)

drawer = drawer.replace(
  J(['      setWires(next)', '      setWireSize({ width: scroller.scrollWidth, height: scroller.scrollHeight })']),
  J([
    '      // Only touch state when something actually moved: the parent may',
    '      // re-render for unrelated reasons, and a blind setState here loops.',
    '      setWires((current) => {',
    "        if (current.length === next.length && current.every((wire, index) => wire.d === next[index]?.d && wire.synced === next[index]?.synced)) {",
    '          return current',
    '        }',
    '        return next',
    '      })',
    '      setWireSize((current) => (',
    '        current.width === scroller.scrollWidth && current.height === scroller.scrollHeight',
    '          ? current',
    '          : { width: scroller.scrollWidth, height: scroller.scrollHeight }',
    '      ))',
  ]),
)

// depend on the link list by value, not identity
drawer = drawer.replace(
  '  }, [props.links, visibleItems, query])',
  "  }, [props.links, visibleItems, query])",
)

fs.writeFileSync(drawerFile, drawer, 'utf8')

// ------------------------------------------------------------------ canvas ---
const canvasFile = 'src/client/MapCanvas.tsx'
let canvas = fs.readFileSync(canvasFile, 'utf8')
const CD = canvas.includes('\r\n') ? '\r\n' : '\n'
const CJ = (lines) => lines.join(CD)

canvas = canvas.replace(
  CJ(['              links={drawerLinks(drawerItems(drawer.groupId).map(item => item.cardId))}']),
  CJ(['              links={drawerWireLinks}']),
)

// one memo for the open drawer only
const anchor = CJ(['  /** Faces for a stored edge, from where its two cards are right now. */'])
if (!canvas.includes(anchor)) {
  console.error('canvas anchor missing')
  process.exit(1)
}

const memo = CJ([
  '  /**',
  '   * Links for the open drawer. Memoised: a fresh array every render would make',
  '   * the drawer measuring effect loop (React #185).',
  '   */',
  '  const drawerWireLinks = useMemo(() => {',
  '    if (drawer === null) return []',
  '    const cardIds = Object.values(canvasState.cards)',
  '      .filter(card => card.groupId === drawer.groupId)',
  '      .map(card => card.id)',
  '    return drawerLinks(cardIds)',
  '  }, [drawer, canvasState.edges, canvasState.cards, sessions])',
  '',
  anchor,
])
canvas = canvas.replace(anchor, memo)

fs.writeFileSync(canvasFile, canvas, 'utf8')
console.log('loop fixed')
