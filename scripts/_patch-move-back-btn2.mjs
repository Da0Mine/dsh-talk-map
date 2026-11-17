/**
 * 1) The "back to current conversation" crosshair leaves the sidebar footer and joins the
 *    map panel's header (footer keeps only the map toggle — narrower, no stray icon).
 * 2) The sidebar queue gets a hover-visible drag handle on its top edge; the chosen height
 *    is remembered (localStorage), clamped to a sane range.
 */
import fs from 'node:fs'

const edits = []

// ── MapToggleButton: drop the crosshair button ─────────────────────────────
let backIcon = ''
{
  const file = 'src/client/MapToggleButton.tsx'
  let text = fs.readFileSync(file, 'utf8')

  const startAt = text.indexOf("      <button\n        type=\"button\"\n        className={styles['backToCurrent']}")
  if (startAt < 0) throw new Error('footer back button not found')
  const endAt = text.indexOf('      </button>', startAt)
  if (endAt < 0) throw new Error('footer back button end not found')
  text = text.slice(0, startAt) + text.slice(endAt + '      </button>\n'.length)

  text = text.replace(
    "import { closeMapPanel, currentSessionId, mapUi, openSessionInUi, reportSidebarWide } from './map-state.ts'",
    "import { mapUi, reportSidebarWide } from './map-state.ts'",
  )
  text = text.replace("  const backTitle = t('map.backToCurrent')\n\n", '')

  // Take the icon with us (it is still the right glyph for the header button).
  const iconAt = text.indexOf('function BackIcon(')
  if (iconAt >= 0) {
    let end = text.indexOf('\n}\n', iconAt)
    end = end < 0 ? text.length : end + 3
    backIcon = text.slice(iconAt, end)
    text = text.slice(0, iconAt) + text.slice(end)
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapToggleButton: crosshair removed from the footer')
}

// ── MapOverlay: header button ──────────────────────────────────────────────
{
  const file = 'src/client/MapOverlay.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    "import { closeMapPanel, hideSidebarForMap, mapUi, openSessionInUi, restoreSidebarAfterMap } from './map-state.ts'",
    "import { closeMapPanel, currentSessionId, hideSidebarForMap, mapUi, openSessionInUi, restoreSidebarAfterMap } from './map-state.ts'",
  )

  // The icon component we carried over (named to avoid clashing with BackIcon).
  const icon = backIcon.replace('function BackIcon(', 'function BackToCurrentIcon(')
  const anchor = 'export function MapOverlay('
  if (!text.includes(anchor)) throw new Error('MapOverlay anchor missing')
  text = text.replace(anchor, icon + '\n' + anchor)

  const btnAnchor = `        <span className={styles['headerSpace']} />`
  if (!text.includes(btnAnchor)) throw new Error('header space anchor missing')
  const button = `        <button
          type="button"
          className={styles['backToCurrent']}
          lang={activeLocale()}
          title={t('map.backToCurrent')}
          aria-label={t('map.backToCurrent')}
          data-talkmap-back="1"
          onClick={() => {
            const sessionId = currentSessionId()
            if (sessionId === undefined) return
            // Leaving the map and revealing the conversation is one gesture.
            closeMapPanel()
            openSessionInUi(sessionId)
          }}
        >
          <BackToCurrentIcon />
        </button>
${btnAnchor}`
  text = text.replace(btnAnchor, button)
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapOverlay: crosshair in the header')
}

// ── SidebarQueue: drag handle for the block height ─────────────────────────
{
  const file = 'src/client/SidebarQueue.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    "/** How many cards get a body preview (the Host reads one session surface each). */",
    `/** Remembered queue height in px (the handle drags it; clamped on use). */
const HEIGHT_KEY = 'dsh.talk-map.queueHeight'
const MIN_HEIGHT = 76

function clampHeight(value: number): number {
  const ceiling = Math.max(MIN_HEIGHT, Math.round(window.innerHeight * 0.7))
  return Math.min(ceiling, Math.max(MIN_HEIGHT, value))
}

function storedHeight(): number | undefined {
  try {
    const raw = window.localStorage.getItem(HEIGHT_KEY)
    if (raw === null || raw === '') return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? clampHeight(value) : undefined
  } catch {
    return undefined
  }
}

/** How many cards get a body preview (the Host reads one session surface each). */`,
  )

  text = text.replace(
    `  const [previews, setPreviews] = useState<Record<string, string>>({})`,
    `  const [previews, setPreviews] = useState<Record<string, string>>({})
  // Manual height: undefined = fit the cards, a number = the height the user dragged to.
  const [height, setHeight] = useState<number | undefined>(() => storedHeight())
  const drag = useRef<{ startY: number; startHeight: number } | null>(null)`,
  )

  // handlers, placed right before the rows memo
  text = text.replace(
    `  // Only lamped cards, exactly like the rail.`,
    `  const onGripDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const block = event.currentTarget.parentElement
    const current = block === null ? MIN_HEIGHT : block.getBoundingClientRect().height
    drag.current = { startY: event.clientY, startHeight: current }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onGripMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const active = drag.current
    if (active === null) return
    // The block is anchored to the bottom, so dragging UP must make it taller.
    setHeight(clampHeight(active.startHeight + (active.startY - event.clientY)))
  }

  const onGripUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (drag.current === null) return
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    try {
      if (height === undefined) window.localStorage.removeItem(HEIGHT_KEY)
      else window.localStorage.setItem(HEIGHT_KEY, String(Math.round(height)))
    } catch { /* storage full: the drag still works for this session */ }
  }

  // Only lamped cards, exactly like the rail.`,
  )

  // block style: honour the dragged height
  text = text.replace(
    `      style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, minHeight: 0, maxHeight: '46vh', overflow: 'hidden', flex: '1 1 auto' }}`,
    `      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        flex: '1 1 auto',
        ...(height === undefined ? { maxHeight: '46vh' } : { height: `${height}px`, maxHeight: '70vh' }),
      }}`,
  )

  // grip + head share a row so the head keeps its padding
  text = text.replace(
    `      <div className={styles['sidebarQueueHead']}>`,
    `      <div
        className={styles['queueGrip']}
        role="separator"
        aria-orientation="horizontal"
        title={t('statusRail.resize')}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onPointerCancel={onGripUp}
        onDoubleClick={() => {
          setHeight(undefined)
          try { window.localStorage.removeItem(HEIGHT_KEY) } catch { /* ignore */ }
        }}
      >
        <span className={styles['queueGripBar']} />
      </div>
      <div className={styles['sidebarQueueHead']}>`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('SidebarQueue: drag handle + persisted height')
}

// ── strings ────────────────────────────────────────────────────────────────
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes("'statusRail.resize'")) {
    const zh = "  'statusRail.title': '队列中的任务',"
    const en = "  'statusRail.title': 'Tasks in the queue',"
    if (!text.includes(zh) || !text.includes(en)) throw new Error('i18n anchors missing')
    text = text.replace(zh, zh + "\n  'statusRail.resize': '拖动调整高度（双击恢复自适应）',")
    text = text.replace(en, en + "\n  'statusRail.resize': 'Drag to resize (double-click to fit)',")
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('i18n: resize hint')
}

// ── CSS: the grip ─────────────────────────────────────────────────────────
{
  const file = 'src/client/talk-map.module.css'
  let sheet = fs.readFileSync(file, 'utf8')
  if (!sheet.includes('.queueGrip {')) {
    sheet += String.raw`

/* ── drag handle: the queue's top edge ──────────────────────────────────── */
.queueGrip {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 10px;
  margin: -4px 0 0;
  cursor: ns-resize;
  opacity: 0;
  transition: opacity 120ms ease;
  touch-action: none;
}

/* Only appear while the pointer is over the queue block (as asked). */
.sidebarQueue:hover .queueGrip,
.queueGrip:active {
  opacity: 1;
}

.queueGripBar {
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: var(--dsw-alias-label-tertiary, #6b7280);
}
`
  }
  fs.writeFileSync(file, sheet, 'utf8')
  edits.push('css: queueGrip')
}

console.log(edits.join('\n'))
