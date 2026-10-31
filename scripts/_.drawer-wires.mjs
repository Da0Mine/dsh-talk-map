/** Drawer wires: measure the cards, then draw glowing lines between them. */
import fs from 'node:fs'

const EOL = (text) => (text.includes('\r\n') ? '\r\n' : '\n')

// ---------------------------------------------------------------- drawer ----
const drawerFile = 'src/client/StackDrawer.tsx'
let drawer = fs.readFileSync(drawerFile, 'utf8')
const D = EOL(drawer)
const J = (lines) => lines.join(D)

// 1) prop
drawer = drawer.replace(
  J(['  /** A drag inside the drawer landed: `cardId` now sits at `index`. */']),
  J([
    '  /**',
    '   * Card-to-card links among these items, drawn behind the cards as glowing',
    '   * lines — the drawer used to show nothing but text chips between rows.',
    '   */',
    '  links?: readonly DrawerWire[]',
    '  /** A drag inside the drawer landed: `cardId` now sits at `index`. */',
  ]),
)

// 2) the wire type, next to the other exported types
drawer = drawer.replace(
  J(['export interface StackDrawerProps {']),
  J([
    '/** One line to draw behind the drawer cards. */',
    'export interface DrawerWire {',
    '  from: string',
    '  to: string',
    '  synced: boolean',
    '}',
    '',
    'export interface StackDrawerProps {',
  ]),
)

// 3) state + measuring effect, right after the scroller ref
drawer = drawer.replace(
  J(['  const scrollerRef = useRef<HTMLDivElement | null>(null)']),
  J([
    '  const scrollerRef = useRef<HTMLDivElement | null>(null)',
    '  /** Measured connector lines: curved paths in scroller coordinates. */',
    '  const [wires, setWires] = useState<{ d: string; synced: boolean }[]>([])',
    '  const [wireSize, setWireSize] = useState({ width: 0, height: 0 })',
  ]),
)

// 4) the measuring hook: find it after the visibleItems memo so the geometry is
//    computed from what is actually laid out.
const hookAnchor = drawer.indexOf('  const visibleItems = needle === ')
if (hookAnchor < 0) {
  console.error('visibleItems memo not found')
  process.exit(1)
}
// insert before the memo's closing? simpler: after the memo block ends
const afterVisible = drawer.indexOf('  // Coming back from a conversation should land on the same rows.', hookAnchor)
const insertAt = afterVisible

const hook = J([
  '',
  '  /**',
  '   * Rebuild the connector paths whenever the layout can have changed: the item',
  '   * list, the filter, a resize, or the font scale. Positions come from the real',
  '   * DOM, so the lines always match what the user sees.',
  '   */',
  '  useLayoutEffect(() => {',
  '    const scroller = scrollerRef.current',
  '    const links = props.links ?? []',
  '    if (scroller === null || links.length === 0) {',
  '      setWires(current => (current.length === 0 ? current : []))',
  '      return',
  '    }',
  '    const measure = (): void => {',
  '      const boxOf = (cardId: string): DOMRect | null => {',
  '        const element = scroller.querySelector(`[data-card-id="${cardId}"]`)',
  '        if (element === null) return null',
  '        const rect = element.getBoundingClientRect()',
  '        const base = scroller.getBoundingClientRect()',
  '        return new DOMRect(',
  '          rect.left - base.left + scroller.scrollLeft,',
  '          rect.top - base.top + scroller.scrollTop,',
  '          rect.width,',
  '          rect.height,',
  '        )',
  '      }',
  '      const next: { d: string; synced: boolean }[] = []',
  '      for (const link of links) {',
  '        const from = boxOf(link.from)',
  '        const to = boxOf(link.to)',
  '        if (from === null || to === null) continue',
  '        const fromCx = from.x + from.width / 2',
  '        const fromCy = from.y + from.height / 2',
  '        const toCx = to.x + to.width / 2',
  '        const toCy = to.y + to.height / 2',
  '        const dx = toCx - fromCx',
  '        const dy = toCy - fromCy',
  '        let x1: number',
  '        let y1: number',
  '        let x2: number',
  '        let y2: number',
  '        let bend: number',
  '        if (Math.abs(dx) >= Math.abs(dy)) {',
  '          // Side by side: leave the facing edges, curve horizontally.',
  '          x1 = dx >= 0 ? from.x + from.width : from.x',
  '          y1 = fromCy',
  '          x2 = dx >= 0 ? to.x : to.x + to.width',
  '          y2 = toCy',
  '          bend = Math.max(24, Math.min(96, Math.abs(x2 - x1) * 0.55))',
  '          const sign = dx >= 0 ? 1 : -1',
  '          next.push({',
  '            d: `M ${x1} ${y1} C ${x1 + bend * sign} ${y1}, ${x2 - bend * sign} ${y2}, ${x2} ${y2}`,',
  '            synced: link.synced,',
  '          })',
  '        } else {',
  '          // Stacked: leave the top/bottom edges, curve vertically.',
  '          x1 = fromCx',
  '          y1 = dy >= 0 ? from.y + from.height : from.y',
  '          x2 = toCx',
  '          y2 = dy >= 0 ? to.y : to.y + to.height',
  '          bend = Math.max(24, Math.min(72, Math.abs(y2 - y1) * 0.55))',
  '          const sign = dy >= 0 ? 1 : -1',
  '          next.push({',
  '            d: `M ${x1} ${y1} C ${x1} ${y1 + bend * sign}, ${x2} ${y2 - bend * sign}, ${x2} ${y2}`,',
  '            synced: link.synced,',
  '          })',
  '        }',
  '      }',
  '      setWires(next)',
  '      setWireSize({ width: scroller.scrollWidth, height: scroller.scrollHeight })',
  '    }',
  '    measure()',
  '    const observer = new ResizeObserver(() => { measure() })',
  '    observer.observe(scroller)',
  '    return () => { observer.disconnect() }',
  '  }, [props.links, visibleItems, query])',
])

drawer = drawer.slice(0, insertAt) + hook + drawer.slice(insertAt)

// 5) render the svg layer as the first child of the scroller
drawer = drawer.replace(
  J(['        >', '          {visibleItems.map(item => {']),
  J([
    '        >',
    '          {wires.length > 0',
    '            ? (',
    '                <svg',
    '                  className={styles[\'drawerWires\']}',
    '                  width={wireSize.width}',
    '                  height={wireSize.height}',
    '                  viewBox={`0 0 ${wireSize.width} ${wireSize.height}`}',
    '                  aria-hidden="true"',
    '                >',
    '                  {wires.map((wire, index) => (',
    '                    <g key={index}>',
    '                      {wire.synced',
    '                        ? (',
    '                            <path',
    '                              d={wire.d}',
    '                              fill="none"',
    '                              stroke="rgba(196, 219, 255, 0.5)"',
    '                              strokeWidth={6}',
    '                              strokeLinecap="round"',
    '                              style={{ filter: \'blur(3.5px)\' }}',
    '                            />',
    '                          )',
    '                        : null}',
    '                      <path',
    '                        d={wire.d}',
    '                        fill="none"',
    '                        stroke={wire.synced',
    '                          ? \'rgba(240, 246, 255, 0.9)\'',
    '                          : \'rgba(200, 206, 216, 0.35)\'}',
    '                        strokeWidth={wire.synced ? 1.6 : 1.2}',
    '                        strokeLinecap="round"',
    '                      />',
    '                    </g>',
    '                  ))}',
    '                </svg>',
    '              )',
    '            : null}',
    '          {visibleItems.map(item => {',
  ]),
)

// 6) tag each card with its id so the measuring code can find it
drawer = drawer.replace(
  J(['                data-stack-card=""']),
  J(['                data-stack-card=""', '                data-card-id={item.cardId}']),
)

fs.writeFileSync(drawerFile, drawer, 'utf8')
console.log('drawer: wires wired')
