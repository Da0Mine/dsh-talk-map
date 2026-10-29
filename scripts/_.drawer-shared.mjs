/**
 * Replace the drawer's private hit rendering with the shared <SearchResults>.
 * One implementation means every fix (peek portal, auto-loaded hits, markdown,
 * no "more" button) lands in both surfaces.
 */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// --- 1. drop the local peek/more state + helpers (lines are 1-based in grep) --
const startIdx = lines.findIndex(line => line.includes("const [peek, setPeek] = useState"))
const endIdx = lines.findIndex(line => line.includes('useEffect(() => cancelPeek, [])'))
if (startIdx < 0 || endIdx < startIdx) {
  console.error('peek block not found', startIdx, endIdx)
  process.exit(1)
}
lines.splice(startIdx, endIdx - startIdx + 1)

// --- 2. replace the hits JSX block with the shared component ---------------
const hitsStart = lines.findIndex(line => line.includes('{hits.length > 0'))
if (hitsStart < 0) {
  console.error('hits block not found')
  process.exit(1)
}
// find the matching ": null}" closing of that ternary
let hitsEnd = hitsStart
let depth = 0
for (let i = hitsStart; i < lines.length; i += 1) {
  for (const char of lines[i]) {
    if (char === '(' || char === '{' || char === '[') depth += 1
    if (char === ')' || char === '}' || char === ']') depth -= 1
  }
  if (i > hitsStart && depth <= 0) {
    hitsEnd = i
    break
  }
}
const replacement = [
  '          {hits.length > 0',
  '            ? (',
  '                <SearchResults',
  '                  query={query}',
  '                  hits={hits}',
  '                  searching={false}',
  '                  error={null}',
  "                  heading={t('stack.contentHits', { n: String(hits.length) })}",
  '                  onOpenSession={(sessionId) => { props.onOpenSession?.(sessionId) }}',
  '                  onFetchContext={props.onFetchContext}',
  '                  onFetchSessionHits={props.onFetchSessionHits}',
  '                />',
  '              )',
  '            : null}',
]
lines.splice(hitsStart, hitsEnd - hitsStart + 1, ...replacement)

// --- 3. imports -----------------------------------------------------------
let source = lines.join('\n')
if (!source.includes("from './SearchResults.tsx'")) {
  source = source.replace(
    "import { renderMarkdownInline } from './markdown-inline.tsx'",
    "import { SearchResults } from './SearchResults.tsx'",
  )
}
fs.writeFileSync(file, source, 'utf8')
console.log('drawer now reuses SearchResults')
