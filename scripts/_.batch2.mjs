/** Wire the new SearchResults contract: seq-aware open, bigger passages, sub-agent label. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- StackDrawer: prop signature --------------------------------------
let drawer = fs.readFileSync('src/client/StackDrawer.tsx', 'utf8')
drawer = drawer.replace(
  '  /** Open a session found by the content search (it may live in another folder). */\n  onOpenSession?: (sessionId: string) => void',
  '  /** Open a session found by the content search, ideally at that event. */\n  onOpenSession?: (sessionId: string, seq?: number | null) => void',
)
drawer = drawer.replace(
  'onOpenSession={(sessionId) => { props.onOpenSession?.(sessionId) }}',
  'onOpenSession={(sessionId, seq) => { props.onOpenSession?.(sessionId, seq) }}',
)
fs.writeFileSync('src/client/StackDrawer.tsx', drawer, 'utf8')

// ---- GlobalSearch: same contract + title resolver ----------------------
let global = fs.readFileSync('src/client/GlobalSearch.tsx', 'utf8')
global = global.replace(
  'export function GlobalSearch(props: { onOpenSession: (sessionId: string) => void }): React.JSX.Element {',
  'export function GlobalSearch(props: { onOpenSession: (sessionId: string, seq?: number | null) => void }): React.JSX.Element {',
)
global = global.replace(
  J([
    '                    onOpenSession={(sessionId) => {',
    '                      setSubmitted(\'\')',
    '                      props.onOpenSession(sessionId)',
    '                    }}',
  ]),
  J([
    '                    onOpenSession={(sessionId, seq) => {',
    '                      setSubmitted(\'\')',
    '                      props.onOpenSession(sessionId, seq)',
    '                    }}',
  ]),
)
fs.writeFileSync('src/client/GlobalSearch.tsx', global, 'utf8')

// ---- MapCanvas: pass the seq through ---------------------------------
let canvas = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
canvas = canvas.replace(
  '              onOpenSession={(sessionId) => { openSession(sessionId) }}',
  '              onOpenSession={(sessionId, seq) => { openSession(sessionId, seq) }}',
)
fs.writeFileSync('src/client/MapCanvas.tsx', canvas, 'utf8')

// ---- Host: wider passage + sub-agent flag ----------------------------
let host = fs.readFileSync('lib/index.js', 'utf8')
host = host.replace(
  'const window = await corpus.readEvent({ sessionId, seq, before: 2, after: 2 }, signal);',
  'const window = await corpus.readEvent({ sessionId, seq, before: 4, after: 4 }, signal);',
)
host = host.replace('const from = Math.max(0, index - 3);\n\t\t\t\tconst to = Math.min(all.length - 1, index + 3);',
  'const from = Math.max(0, index - 6);\n\t\t\t\tconst to = Math.min(all.length - 1, index + 6);')
// sub-agent marker on search results
host = host.replace(
  `					return {
						sessionId: header?.id ?? hit?.sessionId ?? "",
						blocks: line === "" ? [] : [[line]],
						seqs: [typeof best?.seq === "number" ? best.seq : null]
					};`,
  `					const subagent = header?.origin === "subagent"
						|| typeof header?.delegationDepth === "number"
						|| header?.parentSession !== void 0;
					return {
						sessionId: header?.id ?? hit?.sessionId ?? "",
						blocks: line === "" ? [] : [[line]],
						seqs: [typeof best?.seq === "number" ? best.seq : null],
						...(subagent ? { agent: "subagent" } : {})
					};`,
)
fs.writeFileSync('lib/index.js', host, 'utf8')

console.log('wired: seq-aware open, ±6 lines, sub-agent label')
