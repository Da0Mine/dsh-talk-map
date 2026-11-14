import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// The helper referenced `openSession` in its dependency list, but `openSession` is a
// const declared later in the same scope → TDZ crash that took the whole panel down.
const block = `  /** A rail tap opens that conversation (the same path a card's double click takes). */
  const openRailCard = useCallback((cardId: string) => {
    const card = visibleCards[cardId]
    if (card !== undefined) openSession(card.sessionId)
  }, [visibleCards, openSession])

`
if (!text.includes(block)) { console.log('block not found'); process.exit(1) }
text = text.replace(block, '')

const anchor = `  /**
   * Open a conversation found by a search.`
if (!text.includes(anchor)) { console.log('anchor not found'); process.exit(1) }
text = text.replace(anchor, `  /** A rail tap opens that conversation (declared after openSession: it captures it). */
  const openRailCard = useCallback((cardId: string) => {
    const card = visibleCards[cardId]
    if (card !== undefined) openSession(card.sessionId)
  }, [visibleCards, openSession])

` + anchor)
fs.writeFileSync(file, text, 'utf8')
console.log('openRailCard moved below openSession')
