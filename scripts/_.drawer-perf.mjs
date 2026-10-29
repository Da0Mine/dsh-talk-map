/** Drawer: native scrolling + lazy passage on hover. */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let source = fs.readFileSync(file, 'utf8')
const J = (lines) => lines.join('\n')

// ---- props: lazy context ----------------------------------------------
source = source.replace(
  '  /** Open a session found by the content search (it may live in another folder). */\n  onOpenSession?: (sessionId: string) => void',
  J([
    '  /** Open a session found by the content search (it may live in another folder). */',
    '  onOpenSession?: (sessionId: string) => void',
    '  /** The passage around one hit — fetched on hover, not with the search. */',
    '  onFetchContext?: (sessionId: string, seq: number, query: string) => Promise<string[]>',
  ]),
)

// ---- hit shape gains seqs ---------------------------------------------
source = source.replace(
  J([
    'export interface DrawerSearchHit {',
    '  sessionId: string',
    '  title: string',
    '  blocks: string[][]',
    '}',
  ]),
  J([
    'export interface DrawerSearchHit {',
    '  sessionId: string',
    '  title: string',
    '  blocks: string[][]',
    '  /** Event seq per block, when the Host supplied one. */',
    '  seqs?: (number | null)[]',
    '}',
  ]),
)

// ---- native wheel: drop the custom handler ----------------------------
const wheelOld = J([
  '  // Wheel = page, not micro-scroll: one notch is one card. Registered natively',
  '  // because React attaches wheel listeners passively, where preventDefault is a',
  '  // no-op (and logs an error).',
  '  useEffect(() => {',
  '    const scroller = scrollerRef.current',
  '    if (scroller === null) return',
  '    const onWheel = (event: WheelEvent): void => {',
  '      event.preventDefault()',
  "      scroller.scrollBy({ top: event.deltaY >= 0 ? rowStep(scroller) : -rowStep(scroller), behavior: 'smooth' })",
  '    }',
  "    scroller.addEventListener('wheel', onWheel, { passive: false })",
  "    return () => { scroller.removeEventListener('wheel', onWheel) }",
  '  }, [])',
])
if (!source.includes(wheelOld)) {
  console.error('wheel block not found')
  process.exit(1)
}
source = source.replace(
  wheelOld,
  J([
    '  // Wheel scrolling is the browser\u2019s own: the old handler called',
    '  // preventDefault + scrollBy({behavior: smooth}) per notch, which queued one',
    '  // animation per event (that is what felt sticky and slow).',
    '  // Peeking is suppressed while the list is moving, otherwise every row that',
    '  // slides under the pointer would schedule a popover.',
    '  const lastScrollAt = useRef(0)',
  ]),
)

// ---- hover handler: fetch the passage on demand ----------------------
const peekOld = J([
  '  /** Wait a beat before showing it: a fast pass over the list stays quiet. */',
  '  const schedulePeek = (hit: DrawerSearchHit, block: string[], event: React.MouseEvent): void => {',
  '    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)',
  '    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()',
  '    peekTimer.current = window.setTimeout(() => {',
  '      peekTimer.current = null',
  '      setPeek({ title: hit.title, lines: block, x: rect.left, y: rect.bottom + 6 })',
  '    }, 180)',
  '  }',
])
if (!source.includes(peekOld)) {
  console.error('peek handler not found')
  process.exit(1)
}
source = source.replace(
  peekOld,
  J([
    '  /** Context already fetched, keyed by session:seq (a hover is often repeated). */',
    '  const peekCache = useRef(new Map<string, string[]>())',
    '',
    '  /** Wait a beat before showing it: a fast pass over the list stays quiet. */',
    '  const schedulePeek = (hit: DrawerSearchHit, index: number, event: React.MouseEvent): void => {',
    '    // Moving the list under the pointer is not a hover.',
    '    if (Date.now() - lastScrollAt.current < 220) return',
    '    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)',
    '    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()',
    '    const fallback = hit.blocks[index] ?? []',
    '    const seq = hit.seqs?.[index]',
    '    peekTimer.current = window.setTimeout(() => {',
    '      peekTimer.current = null',
    '      setPeek({ title: hit.title, lines: fallback, x: rect.left, y: rect.bottom + 6 })',
    '      if (typeof seq !== \'number\' || props.onFetchContext === undefined) return',
    '      const key = hit.sessionId + \':\' + String(seq)',
    '      const cached = peekCache.current.get(key)',
    '      if (cached !== undefined) {',
    '        setPeek(current => (current === null ? current : { ...current, lines: cached }))',
    '        return',
    '      }',
    '      void props.onFetchContext(hit.sessionId, seq, query).then((lines) => {',
    '        if (lines.length === 0) return',
    '        peekCache.current.set(key, lines)',
    '        setPeek(current => (current === null ? current : { ...current, lines }))',
    '      })',
    '    }, 180)',
    '  }',
  ]),
)

// ---- call site: pass the block index ---------------------------------
source = source.replace(
  'onMouseEnter={(event) => { schedulePeek(hit, block, event) }}',
  'onMouseEnter={(event) => { schedulePeek(hit, blockIndex, event) }}',
)
source = source.replace(
  'onFocus={(event) => { schedulePeek(hit, block, event as unknown as React.MouseEvent) }}',
  'onFocus={(event) => { schedulePeek(hit, blockIndex, event as unknown as React.MouseEvent) }}',
)

// ---- scroll: record activity, persist lazily -------------------------
source = source.replace(
  "onScroll={(event) => { drawerState.writeScroll(event.currentTarget.scrollTop) }}",
  J([
    'onScroll={(event) => {',
    '            lastScrollAt.current = Date.now()',
    '            // Writing to localStorage on every scroll event is a big part of',
    '            // the jank: remember the offset after the list settles instead.',
    '            const scroller = event.currentTarget',
    '            if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current)',
    '            scrollSaveTimer.current = window.setTimeout(() => {',
    '              scrollSaveTimer.current = null',
    '              drawerState.writeScroll(scroller.scrollTop)',
    '            }, 200)',
    '          }}',
  ]),
)
source = source.replace(
  '  const lastScrollAt = useRef(0)',
  J([
    '  const lastScrollAt = useRef(0)',
    '  const scrollSaveTimer = useRef<number | null>(null)',
  ]),
)

fs.writeFileSync(file, source, 'utf8')
console.log('drawer: native scroll + lazy hover context')
