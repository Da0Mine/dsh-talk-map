import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')

// DragState: panel-relative base + pointer delta (fixed inside a transformed panel is
// positioned against the panel, not the viewport — that offset was the "jump").
text = text.replace(
  `interface DragState {
  cardId: string
  /** Pointer offset inside the card when it was picked up. */
  grabOffset: number
  pointerY: number
  left: number
  width: number
}`,
  `interface DragState {
  cardId: string
  /** Pointer Y where the card was picked up. */
  startPointerY: number
  /** Card top at pickup, in panel coordinates (see beginDrag). */
  baseTop: number
  pointerY: number
  left: number
  width: number
}`,
)

text = text.replace(
  `    const rect = element.getBoundingClientRect()
    event.preventDefault()
    setDrag({
      cardId,
      grabOffset: event.clientY - rect.top,
      pointerY: event.clientY,
      left: rect.left,
      width: rect.width,
    })`,
  `    const rect = element.getBoundingClientRect()
    // The panel is transformed (it slides in), so a position:fixed child is laid out
    // against the panel, not the viewport. Store panel-relative coordinates and move by
    // the pointer delta — using viewport numbers made the card jump on pickup.
    const panelRect = panelRef.current?.getBoundingClientRect()
    event.preventDefault()
    setDrag({
      cardId,
      startPointerY: event.clientY,
      baseTop: rect.top - (panelRect?.top ?? 0),
      pointerY: event.clientY,
      left: rect.left - (panelRect?.left ?? 0),
      width: rect.width,
    })`,
)

text = text.replace(
  "                      top: drag.pointerY - drag.grabOffset,",
  "                      top: drag.baseTop + (drag.pointerY - drag.startPointerY),",
)

// panelRef
text = text.replace(
  "  const slotsRef = useRef(new Map<string, HTMLDivElement>())",
  "  const slotsRef = useRef(new Map<string, HTMLDivElement>())\n  const panelRef = useRef<HTMLDivElement | null>(null)",
)
text = text.replace(
  '      <div className={styles[\'statusRailPanel\']} aria-hidden={!open}>',
  '      <div className={styles[\'statusRailPanel\']} aria-hidden={!open} ref={panelRef}>',
)

fs.writeFileSync(file, text, 'utf8')
console.log('drag coordinates are panel-relative now')
