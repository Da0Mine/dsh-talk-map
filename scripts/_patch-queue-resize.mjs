/** SidebarQueue: hover drag handle for the block height (persisted). */
import fs from 'node:fs'

const file = 'src/client/SidebarQueue.tsx'
let text = fs.readFileSync(file, 'utf8')
const edits = []

text = text.replace(
  "/** How many cards get a body preview (the Host reads one session surface each). */",
  [
    '/** Remembered queue height in px (the handle drags it; clamped on use). */',
    "const HEIGHT_KEY = 'dsh.talk-map.queueHeight'",
    'const MIN_HEIGHT = 76',
    '',
    'function clampHeight(value: number): number {',
    '  const ceiling = Math.max(MIN_HEIGHT, Math.round(window.innerHeight * 0.7))',
    '  return Math.min(ceiling, Math.max(MIN_HEIGHT, value))',
    '}',
    '',
    'function storedHeight(): number | undefined {',
    '  try {',
    '    const raw = window.localStorage.getItem(HEIGHT_KEY)',
    "    if (raw === null || raw === '') return undefined",
    '    const value = Number(raw)',
    '    return Number.isFinite(value) ? clampHeight(value) : undefined',
    '  } catch {',
    '    return undefined',
    '  }',
    '}',
    '',
    '/** How many cards get a body preview (the Host reads one session surface each). */',
  ].join('\n'),
)
edits.push('constants')

text = text.replace(
  '  const [previews, setPreviews] = useState<Record<string, string>>({})',
  [
    '  const [previews, setPreviews] = useState<Record<string, string>>({})',
    '  // Manual height: undefined = fit the cards, a number = what the user dragged to.',
    '  const [height, setHeight] = useState<number | undefined>(() => storedHeight())',
    '  const drag = useRef<{ startY: number; startHeight: number } | null>(null)',
  ].join('\n'),
)
edits.push('state')

text = text.replace(
  '  // Only lamped cards, exactly like the rail.',
  [
    '  const onGripDown = (event: React.PointerEvent<HTMLDivElement>): void => {',
    '    event.preventDefault()',
    '    const block = event.currentTarget.parentElement',
    '    const current = block === null ? MIN_HEIGHT : block.getBoundingClientRect().height',
    '    drag.current = { startY: event.clientY, startHeight: current }',
    '    event.currentTarget.setPointerCapture(event.pointerId)',
    '  }',
    '',
    '  const onGripMove = (event: React.PointerEvent<HTMLDivElement>): void => {',
    '    const active = drag.current',
    '    if (active === null) return',
    '    // The block is anchored to the bottom, so dragging UP must make it taller.',
    '    setHeight(clampHeight(active.startHeight + (active.startY - event.clientY)))',
    '  }',
    '',
    '  const onGripUp = (event: React.PointerEvent<HTMLDivElement>): void => {',
    '    if (drag.current === null) return',
    '    drag.current = null',
    '    event.currentTarget.releasePointerCapture(event.pointerId)',
    '    try {',
    '      if (height === undefined) window.localStorage.removeItem(HEIGHT_KEY)',
    '      else window.localStorage.setItem(HEIGHT_KEY, String(Math.round(height)))',
    '    } catch { /* storage refused: the drag still applies for this session */ }',
    '  }',
    '',
    '  // Only lamped cards, exactly like the rail.',
  ].join('\n'),
)
edits.push('handlers')

// block style
const oldStyle = "      style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, minHeight: 0, maxHeight: '46vh', overflow: 'hidden', flex: '1 1 auto' }}"
if (!text.includes(oldStyle)) throw new Error('block style anchor missing')
text = text.replace(oldStyle, [
  '      style={{',
  "        display: 'flex',",
  "        flexDirection: 'column',",
  "        width: '100%',",
  '        minWidth: 0,',
  '        minHeight: 0,',
  "        overflow: 'hidden',",
  "        flex: '1 1 auto',",
  "        ...(height === undefined ? { maxHeight: '46vh' } : { height: `${height}px`, maxHeight: '70vh' }),",
  '      }}',
].join('\n'))
edits.push('block style')

// grip element
text = text.replace(
  "      <div className={styles['sidebarQueueHead']}>",
  [
    '      <div',
    "        className={styles['queueGrip']}",
    '        role="separator"',
    '        aria-orientation="horizontal"',
    "        title={t('statusRail.resize')}",
    '        onPointerDown={onGripDown}',
    '        onPointerMove={onGripMove}',
    '        onPointerUp={onGripUp}',
    '        onPointerCancel={onGripUp}',
    '        onDoubleClick={() => {',
    '          setHeight(undefined)',
    '          try { window.localStorage.removeItem(HEIGHT_KEY) } catch { /* ignore */ }',
    '        }}',
    '      >',
    "        <span className={styles['queueGripBar']} />",
    '      </div>',
    "      <div className={styles['sidebarQueueHead']}>",
  ].join('\n'),
)
edits.push('grip element')

fs.writeFileSync(file, text, 'utf8')
console.log(edits.join(', '))
