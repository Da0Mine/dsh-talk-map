/**
 * Stack drawer: drag a card to change the order, and show the connections a card
 * has to other cards in the same folder.
 *
 * Order: the drawer renders the folder's reading order, which is derived from the
 * cards' canvas positions. Dragging writes the new arrangement back as slot
 * coordinates (the same thing the canvas drop does), so the grid, the drawer and
 * the persisted board all agree.
 *
 * Connections: an edge is invisible inside the drawer today, which makes a
 * pushed digest look like it came from nowhere. Each card now lists its
 * outgoing (→) and incoming (←) edges among the folder's own cards.
 */
import fs from 'node:fs'

const J = (lines) => lines.join('\n')

// ---- StackEntry: carry the links -------------------------------------
let drawer = fs.readFileSync('src/client/StackDrawer.tsx', 'utf8')
const EOL = drawer.includes('\r\n') ? '\r\n' : '\n'
drawer = drawer.replace(
  J([
    '  /** Pinned in the sidebar. */',
    '  pinned?: boolean',
    '}',
  ]).replace(/\n/g, EOL),
  J([
    '  /** Pinned in the sidebar. */',
    '  pinned?: boolean',
    '  /** Connections to other cards of the same folder (injection direction). */',
    '  links?: { toCardId: string; title: string; kind: string; outgoing: boolean }[]',
    '}',
  ]).replace(/\n/g, EOL),
)
fs.writeFileSync('src/client/StackDrawer.tsx', drawer, 'utf8')
console.log('StackEntry.links added')
