import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
const source = fs.readFileSync(file, 'utf8')

const oldBlock = `      const reading = readingOrder(members)
      // Pinned sessions lead their folder — same pin the sidebar flips, so a
      // pin made there shows up here and vice versa. A stable sort keeps the
      // reading order inside each group.
      const ordered = pinnedSessions.size === 0
        ? reading
        : [...reading].sort((a, b) => {
          const pinA = pinnedSessions.has(visibleCards[a]?.sessionId ?? '') ? 0 : 1
          const pinB = pinnedSessions.has(visibleCards[b]?.sessionId ?? '') ? 0 : 1
          return pinA - pinB
        })
      const capacity = capacityFor(rect)
      const visibleSlots = visibleCount(capacity, ordered.length)
      out[groupId] = {
        rect,
        ordered,
        shown: ordered.slice(0, visibleSlots),
        folded: ordered.length > capacity ? ordered.slice(visibleSlots) : [],
      }`

const newBlock = `      const reading = readingOrder(members)
      // Pinned sessions lead their folder — same pin the sidebar flips, so a
      // pin made there shows up here and vice versa. A stable sort keeps the
      // reading order inside each group.
      const byPin = (list: string[]): string[] => (pinnedSessions.size === 0
        ? list
        : [...list].sort((a, b) => {
          const pinA = pinnedSessions.has(visibleCards[a]?.sessionId ?? '') ? 0 : 1
          const pinB = pinnedSessions.has(visibleCards[b]?.sessionId ?? '') ? 0 : 1
          return pinA - pinB
        }))
      let ordered = byPin(reading)
      if (draggingCardId !== null && ordered.includes(draggingCardId)) {
        // While a card is in the air the folder previews the INSERTION: the card
        // leaves the order and goes back in at the slot under its centre, so the
        // neighbour it reaches yields at once instead of on release. Without
        // this the dragged card could even sort itself into the overflow cell and
        // disappear mid-drag.
        const others = ordered.filter(cardId => cardId !== draggingCardId)
        const capacity = capacityFor(rect)
        const slots = visibleCount(capacity, others.length + 1)
        const wanted = dragCenter === null
          ? others.length
          : slotIndexAt(rect, dragCenter)
        const insertAt = Math.min(Math.max(0, wanted), Math.max(0, Math.min(slots, others.length) - 1))
        ordered = [...others.slice(0, insertAt), draggingCardId, ...others.slice(insertAt)]
      }
      const capacity = capacityFor(rect)
      const visibleSlots = visibleCount(capacity, ordered.length)
      out[groupId] = {
        rect,
        ordered,
        shown: ordered.slice(0, visibleSlots),
        folded: ordered.length > capacity ? ordered.slice(visibleSlots) : [],
      }`

if (!source.includes(oldBlock)) {
  console.error('layout block not found')
  process.exit(1)
}
let next = source.replace(oldBlock, newBlock)
next = next.replace(
  '  }, [frameRects, membersByGroup, visibleCards, pinnedSessions])',
  '  }, [frameRects, membersByGroup, visibleCards, pinnedSessions, draggingCardId, dragCenter])',
)
fs.writeFileSync(file, next, 'utf8')
console.log('folder layout previews the insertion')
