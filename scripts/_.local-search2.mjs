/** Publish the card table; header search filters it locally. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- canvas: publish the card table -----------------------------------
let canvas = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
if (!canvas.includes('setCardTable(')) {
  const anchor = '    setTitleResolver((sessionId) => renamedTitles[sessionId] ?? sessions.byId[sessionId]?.displayTitle)'
  if (!canvas.includes(anchor)) {
    console.error('title resolver anchor missing')
    process.exit(1)
  }
  canvas = canvas.replace(
    anchor,
    J([
      anchor,
      '    setCardTable(Object.entries(canvasState.cards).map(([cardId, card]) => ({',
      '      cardId,',
      '      sessionId: card.sessionId,',
      '      title: renamedTitles[card.sessionId] ?? sessions.byId[card.sessionId]?.displayTitle ?? card.sessionId,',
      "      preview: previews[card.sessionId] ?? '',",
      "      workspaceTitle: wsTitles.get(sessionWs.get(card.sessionId) ?? '') ?? '',",
      '    })))',
    ]),
  )
  canvas = canvas.replace(
    "import { allSessionTitles, setTitleResolver, setTitleTable } from './map-state.ts'",
    "import { allSessionTitles, setCardTable, setTitleResolver, setTitleTable } from './map-state.ts'",
  )
  fs.writeFileSync('src/client/MapCanvas.tsx', canvas, 'utf8')
}

// ---- GlobalSearch: local filter ---------------------------------------
let global = fs.readFileSync('src/client/GlobalSearch.tsx', 'utf8')
global = global.replace(
  "import { allSessionTitles, mapUi, sessionTitle } from './map-state.ts'",
  "import { allCards, mapUi, sessionTitle } from './map-state.ts'",
)
const start = global.indexOf('  const run = async (value: string): Promise<void> => {')
if (start < 0) {
  console.error('run() start not found')
  process.exit(1)
}
// the function ends at the first line that is exactly "  }" followed by a blank line
let end = start
let depth = 0
for (let i = start; i < global.length; i += 1) {
  const char = global[i]
  if (char === '{') depth += 1
  if (char === '}') {
    depth -= 1
    if (depth === 0) {
      end = i + 1
      break
    }
  }
}
const replacement = J([
  '  /** Local filter over the cards the map has rendered — no corpus query. */',
  '  const run = (value: string): void => {',
  '    const needle = value.trim().toLowerCase()',
  "    if (needle === '') {",
  "      setSubmitted('')",
  '      setHits([])',
  '      return',
  '    }',
  '    setSubmitted(value.trim())',
  '    setSearching(false)',
  '    setError(null)',
  '    const views = allCards()',
  '      .filter(card => card.title.toLowerCase().includes(needle)',
  '        || card.preview.toLowerCase().includes(needle))',
  '      .map(card => {',
  '        const titleHit = card.title.toLowerCase().includes(needle)',
  '        return {',
  '          sessionId: card.sessionId,',
  "          title: card.workspaceTitle === '' ? card.title : card.title + ' · ' + card.workspaceTitle,",
  '          blocks: [[titleHit ? card.title : card.preview]],',
  '          seqs: [null],',
  '          roles: [null],',
  '          byTitle: titleHit,',
  '        }',
  '      })',
  '    setHits(views)',
  '    saveSearch(GLOBAL_SCOPE, { query: value.trim(), hits: views })',
  '  }',
])
global = global.slice(0, start) + replacement + global.slice(end)
global = global.replace(/void run\(/g, 'run(')
fs.writeFileSync('src/client/GlobalSearch.tsx', global, 'utf8')

console.log('card table + local header search')
