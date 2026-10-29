/** Persist the WHOLE previewed order on drop, so the arrangement cannot snap back. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')

const oldBlock = `          // Persist the insertion the folder was previewing: the card lands on
          // that slot, so the derived reading order keeps the new arrangement.
          const landing = cardLayout[change.id]
          if (landing !== undefined) canvas.moveCard(change.id, landing.x, landing.y)`
const newBlock = `          // Persist the order the folder was PREVIEWING — every card, not just the
          // dragged one. Writing only the dragged card left two cards sharing a
          // slot's coordinates, so the re-derived reading order fell back to the
          // old arrangement and the whole group snapped back on release.
          const groupId = sessionWs.get(visibleCards[change.id]?.sessionId ?? '')
          const layout = groupId === undefined ? undefined : folderLayouts[groupId]
          if (groupId !== undefined && layout !== undefined) {
            const rect = frameRects[groupId] ?? wsFrames[groupId]
            if (rect !== undefined) {
              const cols = colsForWidth(rect.width)
              layout.ordered.forEach((cardId, index) => {
                const point = slotPoint(rect, index, cols)
                canvas.moveCard(cardId, point.x, point.y)
              })
            }
          }`

if (!source.includes(oldBlock)) {
  console.error('drop block not found')
  process.exit(1)
}
source = source.replace(oldBlock, newBlock)

// colsForWidth needs importing
if (!source.includes('colsForWidth')) {
  source = source.replace(
    '  capacityFor, frameRect, layoutFor, readingOrder, slotIndexAt, slotPoint, visibleCount, type PlacedCard,',
    '  capacityFor, colsForWidth, frameRect, layoutFor, readingOrder, slotIndexAt, slotPoint, visibleCount, type PlacedCard,',
  )
}

fs.writeFileSync(file, source, 'utf8')
console.log('drop persists the whole order')
