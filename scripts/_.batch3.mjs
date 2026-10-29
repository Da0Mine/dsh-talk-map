/** The second argument of onOpenSession is the text to flash after the jump. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- shared results: pass the query, not the seq ----------------------
let shared = fs.readFileSync('src/client/SearchResults.tsx', 'utf8')
shared = shared.replace(
  '  onOpenSession: (sessionId: string, seq?: number | null) => void',
  '  /** `q` is the searched text: the caller flashes it after the jump. */\n  onOpenSession: (sessionId: string, q?: string) => void',
)
shared = shared.replace(
  '                onClick={() => { props.onOpenSession(hit.sessionId, seqs[0] ?? null) }}',
  '                onClick={() => { props.onOpenSession(hit.sessionId, props.query) }}',
)
shared = shared.replace(
  '                  onClick={() => { props.onOpenSession(hit.sessionId, seqs[index] ?? null) }}',
  '                  onClick={() => { props.onOpenSession(hit.sessionId, props.query) }}',
)
fs.writeFileSync('src/client/SearchResults.tsx', shared, 'utf8')

// ---- drawer + global pass it through ---------------------------------
let drawer = fs.readFileSync('src/client/StackDrawer.tsx', 'utf8')
drawer = drawer.replace(
  '  onOpenSession?: (sessionId: string, seq?: number | null) => void',
  '  onOpenSession?: (sessionId: string, q?: string) => void',
)
drawer = drawer.replace(
  'onOpenSession={(sessionId, seq) => { props.onOpenSession?.(sessionId, seq) }}',
  'onOpenSession={(sessionId, q) => { props.onOpenSession?.(sessionId, q) }}',
)
fs.writeFileSync('src/client/StackDrawer.tsx', drawer, 'utf8')

let global = fs.readFileSync('src/client/GlobalSearch.tsx', 'utf8')
global = global.replace(
  'props: { onOpenSession: (sessionId: string, seq?: number | null) => void }',
  'props: { onOpenSession: (sessionId: string, q?: string) => void }',
)
global = global.replace(
  J([
    '                    onOpenSession={(sessionId, seq) => {',
    '                      setSubmitted(\'\')',
    '                      props.onOpenSession(sessionId, seq)',
    '                    }}',
  ]),
  J([
    '                    onOpenSession={(sessionId, q) => {',
    '                      setSubmitted(\'\')',
    '                      props.onOpenSession(sessionId, q)',
    '                    }}',
  ]),
)
fs.writeFileSync('src/client/GlobalSearch.tsx', global, 'utf8')

// ---- MapCanvas: flash after opening ----------------------------------
let canvas = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
canvas = canvas.replace(
  '              onOpenSession={(sessionId, seq) => { openSession(sessionId, seq) }}',
  '              onOpenSession={(sessionId, q) => { openSearchHit(sessionId, q) }}',
)
const helper = `  /** Open a conversation found by a search and flash the searched text in it. */
  const openSearchHit = (sessionId: string, query?: string): void => {
    openSession(sessionId)
    if (query !== undefined && query.trim() !== '') flashInTranscript(query)
  }

`
const anchor = '  /**\n   * Search inside ONE workspace: the folder\'s cwd is passed to the Host as a'
if (canvas.includes(anchor)) {
  canvas = canvas.replace(anchor, helper + anchor)
} else {
  console.error('openSearchHit anchor missing')
}
if (!canvas.includes("import { flashInTranscript }")) {
  canvas = canvas.replace(
    "import { callRpc, fetchSearchContext, fetchSessionHits, searchSessions, type ContentHit } from './rpc.ts'",
    "import { flashInTranscript } from './jump-highlight.ts'\nimport { callRpc, fetchSearchContext, fetchSessionHits, searchSessions, type ContentHit } from './rpc.ts'",
  )
}
fs.writeFileSync('src/client/MapCanvas.tsx', canvas, 'utf8')

// ---- MapOverlay: the header search flashes too ------------------------
let overlay = fs.readFileSync('src/client/MapOverlay.tsx', 'utf8')
overlay = overlay.replace(
  '        <GlobalSearch onOpenSession={(sessionId) => { openSessionInUi(sessionId) }} />',
  J([
    '        <GlobalSearch',
    '          onOpenSession={(sessionId, q) => {',
    '            openSessionInUi(sessionId)',
    '            if (q !== undefined && q.trim() !== \'\') flashInTranscript(q)',
    '          }}',
    '        />',
  ]),
)
if (!overlay.includes('flashInTranscript')) {
  overlay = overlay.replace(
    "import { fontScale } from './font-scale.ts'",
    "import { fontScale } from './font-scale.ts'\nimport { flashInTranscript } from './jump-highlight.ts'",
  )
}
fs.writeFileSync('src/client/MapOverlay.tsx', overlay, 'utf8')

console.log('jump + flash wired')
