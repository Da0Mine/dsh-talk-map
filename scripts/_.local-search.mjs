/** Both searches become local: only what the map has already rendered. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- map-state: a card table the header search can filter --------------
let state = fs.readFileSync('src/client/map-state.ts', 'utf8')
if (!state.includes('export function setCardTable')) {
  state += J([
    '',
    '/** Cards currently on the board (title + body) — the header search reads this. */',
    'export interface CardTableEntry {',
    '  cardId: string',
    '  sessionId: string',
    '  title: string',
    '  preview: string',
    '  workspaceTitle: string',
    '}',
    '',
    'let cardTable: CardTableEntry[] = []',
    '',
    'export function setCardTable(next: CardTableEntry[]): void {',
    '  cardTable = next',
    '}',
    '',
    'export function allCards(): CardTableEntry[] {',
    '  return cardTable',
    '}',
    '',
  ])
}
fs.writeFileSync('src/client/map-state.ts', state, 'utf8')

// ---- MapCanvas: publish it, and make the drawer search local ----------
let canvas = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
canvas = canvas.replace(
  '    setTitleTable(Object.entries(sessions.byId).map(([sessionId, row]) => ({',
  J([
    '    setCardTable(Object.entries(canvasState.cards).map(([cardId, card]) => ({',
    '      cardId,',
    '      sessionId: card.sessionId,',
    '      title: renamedTitles[card.sessionId] ?? sessions.byId[card.sessionId]?.displayTitle ?? card.sessionId,',
    '      preview: previews[card.sessionId] ?? \'\',',
    '      workspaceTitle: wsTitles.get(sessionWs.get(card.sessionId) ?? \'\') ?? \'\',',
    '    })))',
    '    setTitleTable(Object.entries(sessions.byId).map(([sessionId, row]) => ({',
  ]),
)
canvas = canvas.replace(
  "import { allSessionTitles, setTitleResolver, setTitleTable } from './map-state.ts'",
  "import { allSessionTitles, setCardTable, setTitleResolver, setTitleTable } from './map-state.ts'",
)

// drawer search: only the rows this folder is rendering
const oldSearch = /  const searchInWorkspace = async[\s\S]*?\n  \}\n/
if (!oldSearch.test(canvas)) {
  console.error('searchInWorkspace block not found')
  process.exit(1)
}
canvas = canvas.replace(
  oldSearch,
  J([
    '  /**',
    '   * The drawer search is intentionally LOCAL: it filters the rows this folder',
    '   * is rendering (title + body) instead of asking the corpus. Nothing leaves',
    '   * the board, so it is instant and it can never show a conversation the folder',
    '   * does not contain.',
    '   */',
    '  const searchInWorkspace = async (groupId: string, query: string): Promise<DrawerSearchHit[]> => {',
    '    const needle = query.trim().toLowerCase()',
    '    if (needle === \'\') return []',
    '    return drawerItems(groupId)',
    '      .filter(item => item.title.toLowerCase().includes(needle)',
    '        || (item.preview ?? \'\').toLowerCase().includes(needle))',
    '      .map(item => ({',
    '        sessionId: item.sessionId,',
    '        title: item.title,',
    '        blocks: [[item.title.toLowerCase().includes(needle)',
    '          ? item.title',
    '          : (item.preview ?? item.title)]],',
    '        seqs: [null],',
    '        roles: [null],',
    '        byTitle: item.title.toLowerCase().includes(needle),',
    '      }))',
    '  }',
    '',
  ]),
)
fs.writeFileSync('src/client/MapCanvas.tsx', canvas, 'utf8')

// ---- GlobalSearch: filter the board, no host call ---------------------
let global = fs.readFileSync('src/client/GlobalSearch.tsx', 'utf8')
global = global.replace(
  "import { allSessionTitles, mapUi, sessionTitle } from './map-state.ts'",
  "import { allCards, allSessionTitles, mapUi, sessionTitle } from './map-state.ts'",
)
const runOld = /  const run = async \(value: string\): Promise<void> => \{[\s\S]*?\n  \}\n/
if (!runOld.test(global)) {
  console.error('run() not found')
  process.exit(1)
}
global = global.replace(
  runOld,
  J([
    '  /** Local filter over the cards the map has rendered — no corpus query. */',
    '  const run = (value: string): void => {',
    '    const needle = value.trim().toLowerCase()',
    '    if (needle === \'\') {',
    '      setSubmitted(\'\')',
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
    '          title: card.workspaceTitle === \'\' ? card.title : card.title + \' · \' + card.workspaceTitle,',
    '          blocks: [[titleHit ? card.title : card.preview]],',
    '          seqs: [null],',
    '          roles: [null],',
    '          byTitle: titleHit,',
    '        }',
    '      })',
    '    setHits(views)',
    '    saveSearch(GLOBAL_SCOPE, { query: value.trim(), hits: views })',
    '  }',
    '',
  ]),
)
global = global.replace(/void run\(query\)/g, 'run(query)')
global = global.replace(/void run\(value\)/g, 'run(value)')
fs.writeFileSync('src/client/GlobalSearch.tsx', global, 'utf8')

console.log('searches are local now')
