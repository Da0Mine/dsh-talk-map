/** Batch: persist both searches, per-session loading rows, scroll-scan the jump. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- GlobalSearch: restore + save -------------------------------------
let global = fs.readFileSync('src/client/GlobalSearch.tsx', 'utf8')
global = global.replace(
  "import { mapUi, sessionTitle } from './map-state.ts'",
  "import { mapUi, sessionTitle } from './map-state.ts'\nimport { clearSearch, loadSearch, saveSearch } from './search-store.ts'",
)
global = global.replace(
  J([
    "  const [query, setQuery] = useState('')",
    '  /** The query the visible results belong to (empty = panel closed). */',
    "  const [submitted, setSubmitted] = useState('')",
    '  const [hits, setHits] = useState<SearchHitView[]>([])',
  ]),
  J([
    "  // Restored from the last session: jumping into a conversation closes this",
    '  // panel, and coming back should show the same search again.',
    '  const remembered = loadSearch<SearchHitView>(GLOBAL_SCOPE)',
    "  const [query, setQuery] = useState(remembered?.query ?? '')",
    '  /** The query the visible results belong to (empty = panel closed). */',
    "  const [submitted, setSubmitted] = useState('')",
    '  const [hits, setHits] = useState<SearchHitView[]>(remembered?.hits ?? [])',
  ]),
)
global = global.replace(
  "export function GlobalSearch(props:",
  "/** Storage scope of the header search. */\nconst GLOBAL_SCOPE = 'global'\n\nexport function GlobalSearch(props:",
)
// save after a successful search
global = global.replace(
  J([
    '      setHits(found.map(hit => ({',
    '        sessionId: hit.sessionId,',
    '        title: sessionTitle(hit.sessionId) ?? hit.sessionId,',
    '        blocks: hit.blocks,',
    '        seqs: hit.seqs,',
    '        agent: hit.agent,',
    '        depth: hit.depth,',
    '      })))',
  ]),
  J([
    '      const views = found.map(hit => ({',
    '        sessionId: hit.sessionId,',
    '        title: sessionTitle(hit.sessionId) ?? hit.sessionId,',
    '        blocks: hit.blocks,',
    '        seqs: hit.seqs,',
    '        agent: hit.agent,',
    '        depth: hit.depth,',
    '      }))',
    '      setHits(views)',
    '      saveSearch(GLOBAL_SCOPE, { query: trimmed, hits: views })',
  ]),
)
// reopen the panel with the remembered results instead of closing it
global = global.replace(
  J([
    '                    onOpenSession={(sessionId, q) => {',
    "                      setSubmitted('')",
    '                      props.onOpenSession(sessionId, q)',
    '                    }}',
  ]),
  J([
    '                    onOpenSession={(sessionId, q) => {',
    '                      props.onOpenSession(sessionId, q)',
    '                    }}',
  ]),
)
// "submitted" starts empty (panel closed) — reopen it if we have results
global = global.replace(
  '      {submitted !== \'\'',
  '      {(submitted !== \'\' || hits.length > 0)',
)
global = global.replace(
  'query={submitted}',
  'query={submitted === \'\' ? query : submitted}',
)
fs.writeFileSync('src/client/GlobalSearch.tsx', global, 'utf8')

console.log('global search persists')
