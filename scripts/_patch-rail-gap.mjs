/** Make the column really make room while dragging: keep the order stable, open a gap. */
import fs from 'node:fs'

const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) DragState: hover index + the step to open up
text = text.replace(
  `interface DragState {
  cardId: string
  /** Pointer Y where the card was picked up. */
  startPointerY: number`,
  `interface DragState {
  cardId: string
  /** Index the card would land on if dropped now (over the compacted column). */
  hoverIndex: number
  /** How far the cards after the gap move down (card height + list gap). */
  step: number
  /** Pointer Y where the card was picked up. */
  startPointerY: number`,
)

// 2) beginDrag: seed hoverIndex/step
text = text.replace(
  `    setDrag({
      cardId,
      startPointerY: event.clientY,`,
  `    setDrag({
      cardId,
      hoverIndex: Math.max(0, orderRef.current.indexOf(cardId)),
      step: rect.height + 10,
      startPointerY: event.clientY,`,
)

// 3) pointermove: only move the gap (no reorder until drop)
text = text.replace(
  `    const onMove = (event: PointerEvent): void => {
      setDrag(current => (current === null ? null : { ...current, pointerY: event.clientY }))
      const target = indexUnder(event.clientY)
      setOrder(current => {
        const from = current.indexOf(cardId)
        if (from < 0 || target < 0 || target >= current.length || from === target) return current
        const next = [...current]
        next.splice(from, 1)
        next.splice(target, 0, cardId)
        return next
      })
    }`,
  `    const onMove = (event: PointerEvent): void => {
      const target = indexUnder(event.clientY)
      setDrag(current => (current === null
        ? null
        : { ...current, pointerY: event.clientY, hoverIndex: target }))
    }`,
)

// 4) drop: commit the order the user saw
text = text.replace(
  `    const onUp = (): void => {
      writeOrder(orderRef.current)
      prevTops.current.clear()
      setDrag(null)
    }`,
  `    const onUp = (): void => {
      setDrag(current => {
        if (current !== null) {
          setOrder(existing => {
            const rest = existing.filter(id => id !== current.cardId)
            const at = Math.min(Math.max(current.hoverIndex, 0), rest.length)
            const next = [...rest.slice(0, at), current.cardId, ...rest.slice(at)]
            writeOrder(next)
            return next
          })
        }
        return null
      })
      prevTops.current.clear()
    }`,
)

// 5) indexUnder must ignore the floating card (it is out of flow)
text = text.replace(
  `      const ids = orderRef.current
      for (let index = 0; index < ids.length; index += 1) {
        const element = slotsRef.current.get(ids[index]!)
        if (element === undefined) continue`,
  `      const ids = orderRef.current.filter(id => id !== cardId)
      for (let index = 0; index < ids.length; index += 1) {
        const element = slotsRef.current.get(ids[index]!)
        if (element === undefined) continue`,
)

// 6) render: the cards after the gap slide down
text = text.replace(
  `                  : shift[entry.cardId] !== undefined
                    ? { transform: \`translateY(\${shift[entry.cardId]}px)\`, transition: 'none' }
                    : { transition: \`transform \${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)\` }}`,
  `                  : drag !== null
                    ? (() => {
                        const compact = ordered.filter(row => row.cardId !== drag.cardId)
                        const position = compact.findIndex(row => row.cardId === entry.cardId)
                        const moved = position >= 0 && position >= drag.hoverIndex ? drag.step : 0
                        return {
                          transform: \`translateY(\${moved}px)\`,
                          transition: \`transform \${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)\`,
                        }
                      })()
                    : shift[entry.cardId] !== undefined
                      ? { transform: \`translateY(\${shift[entry.cardId]}px)\`, transition: 'none' }
                      : { transition: \`transform \${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)\` }}`,
)

fs.writeFileSync(file, text, 'utf8')
console.log('gap-based avoidance wired')
