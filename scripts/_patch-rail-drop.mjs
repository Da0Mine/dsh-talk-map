import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')

// refs so the commit on drop is not a side effect inside a state updater
text = text.replace(
  "  const orderRef = useRef(order)",
  "  const orderRef = useRef(order)\n  const hoverRef = useRef(0)\n  const dragIdRef = useRef<string | null>(null)",
)
text = text.replace(
  "    const cardId = drag.cardId\n",
  "    const cardId = drag.cardId\n    dragIdRef.current = cardId\n    hoverRef.current = drag.hoverIndex\n",
)
text = text.replace(
  `      const target = indexUnder(event.clientY)
      setDrag(current => (current === null
        ? null
        : { ...current, pointerY: event.clientY, hoverIndex: target }))`,
  `      const target = indexUnder(event.clientY)
      hoverRef.current = target
      setDrag(current => (current === null
        ? null
        : { ...current, pointerY: event.clientY, hoverIndex: target }))`,
)
text = text.replace(
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
  `    const onUp = (): void => {
      const dropped = dragIdRef.current
      const at = hoverRef.current
      if (dropped !== null) {
        setOrder(existing => {
          const rest = existing.filter(id => id !== dropped)
          const index = Math.min(Math.max(at, 0), rest.length)
          const next = [...rest.slice(0, index), dropped, ...rest.slice(index)]
          writeOrder(next)
          return next
        })
      }
      dragIdRef.current = null
      prevTops.current.clear()
      setDrag(null)
    }`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('drop commit moved out of the updater')
