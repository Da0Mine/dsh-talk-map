/**
 * Click vs drag on a rail card.
 *
 * The card owns pointerdown (it starts a drag), so it can no longer rely on `onClick`:
 * pointerdown fires first, the drag state is still set when the click event arrives, and
 * the click used to be swallowed — that is why "单击只抓握、不跳转". Now the pointerup
 * decides: a press that barely moved is a click (focus the card on the map), anything
 * further is a reorder.
 */
import fs from 'node:fs'

const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) track movement
text = text.replace(
  "  const dragRef = useRef<DragState | null>(null)\n  dragRef.current = drag",
  "  const dragRef = useRef<DragState | null>(null)\n  dragRef.current = drag\n  /** Did this press travel far enough to count as a drag? */\n  const movedRef = useRef(false)",
)

// 2) beginDrag resets it
text = text.replace(
  "    const index = Math.max(0, orderRef.current.indexOf(cardId))",
  "    const index = Math.max(0, orderRef.current.indexOf(cardId))\n    movedRef.current = false",
)

// 3) pointermove sets it
text = text.replace(
  `    const onMove = (event: PointerEvent): void => {
      const hover = indexUnder(event.clientY)`,
  `    const onMove = (event: PointerEvent): void => {
      const startY = dragRef.current?.startPointerY
      if (startY !== undefined && Math.abs(event.clientY - startY) > 4) movedRef.current = true
      const hover = indexUnder(event.clientY)`,
)

// 4) pointerup: a still press is a click
text = text.replace(
  `    const onUp = (): void => {
      const current = dragRef.current
      if (current !== null && current.hover !== current.origin) {`,
  `    const onUp = (): void => {
      const current = dragRef.current
      // Press without travel = "take me to this card".
      if (current !== null && movedRef.current === false) {
        prevTops.current.clear()
        setDrag(null)
        props.onFocus(current.cardId)
        return
      }
      if (current !== null && current.hover !== current.origin) {`,
)

// 5) the old onClick guard can never pass; drop it instead of leaving dead code
text = text.replace(
  "      onClick={() => { if (!floating && dragRef.current === null) props.onFocus(entry.cardId) }}\n",
  '',
)

fs.writeFileSync(file, text, 'utf8')
console.log('click vs drag split at pointerup')
