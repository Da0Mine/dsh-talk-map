/** Rail cards: single click opens the conversation, double click locates it on the map. */
import fs from 'node:fs'

const rail = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(rail, 'utf8')

// 1) props: onOpen
text = text.replace(
  `  cardWidth: number
  onFocus: (cardId: string) => void
}`,
  `  cardWidth: number
  /** Double click: select the card and centre the map on it. */
  onFocus: (cardId: string) => void
  /** Single click: open that conversation. */
  onOpen: (cardId: string) => void
}`,
)

// 2) refs for the click/double-click split
text = text.replace(
  "  /** Did this press travel far enough to count as a drag? */\n  const movedRef = useRef(false)",
  `  /** Did this press travel far enough to count as a drag? */
  const movedRef = useRef(false)
  /** Single click is delayed so a double click can cancel it. */
  const clickTimer = useRef<number | null>(null)
  const lastTap = useRef<{ cardId: string; at: number } | null>(null)`,
)

// 3) pointerup: click → open (after a beat), second click → locate
text = text.replace(
  `      // Press without travel = "take me to this card".
      if (current !== null && movedRef.current === false) {
        prevTops.current.clear()
        setDrag(null)
        props.onFocus(current.cardId)
        return
      }`,
  `      // Press without travel is a tap: one tap opens the conversation, a quick second
      // tap (double click) locates the card on the map instead.
      if (current !== null && movedRef.current === false) {
        const cardId = current.cardId
        prevTops.current.clear()
        setDrag(null)
        const now = Date.now()
        const previous = lastTap.current
        if (previous !== null && previous.cardId === cardId && now - previous.at < 320) {
          lastTap.current = null
          if (clickTimer.current !== null) {
            window.clearTimeout(clickTimer.current)
            clickTimer.current = null
          }
          props.onFocus(cardId)
          return
        }
        lastTap.current = { cardId, at: now }
        if (clickTimer.current !== null) window.clearTimeout(clickTimer.current)
        clickTimer.current = window.setTimeout(() => {
          clickTimer.current = null
          lastTap.current = null
          props.onOpen(cardId)
        }, 240)
        return
      }`,
)

fs.writeFileSync(rail, text, 'utf8')

// 4) MapCanvas: pass onOpen
const canvas = 'src/client/MapCanvas.tsx'
let map = fs.readFileSync(canvas, 'utf8')
map = map.replace(
  "      <StatusRail entries={statusEntries} cardWidth={CARD_W} onFocus={focusCard} />",
  "      <StatusRail\n        entries={statusEntries}\n        cardWidth={CARD_W}\n        onFocus={focusCard}\n        onOpen={openRailCard}\n      />",
)
map = map.replace(
  "  /** Bring one card into view and select it (a click on a rail row). */",
  `  /** A rail tap opens that conversation (the same path a card's double click takes). */
  const openRailCard = useCallback((cardId: string) => {
    const card = visibleCards[cardId]
    if (card !== undefined) openSession(card.sessionId)
  }, [visibleCards, openSession])

  /** Bring one card into view and select it (a double click on a rail row). */`,
)
fs.writeFileSync(canvas, map, 'utf8')
console.log('rail: click=open, double=locate')
