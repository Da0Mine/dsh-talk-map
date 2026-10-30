/**
 * Local search has no "extra hits" and no peek to fetch — drop that machinery so
 * the panel stops showing loading bars for something that never loads.
 */
import fs from 'node:fs'

function patch(file, edits) {
  let source = fs.readFileSync(file, 'utf8')
  const EOL = source.includes('\r\n') ? '\r\n' : '\n'
  const before = source
  for (const [from, to] of edits) {
    const pattern = Array.isArray(from) ? from.join(EOL) : from
    const replacement = Array.isArray(to) ? to.join(EOL) : to
    if (!source.includes(pattern)) {
      console.error('  ! anchor missing in', file, '→', String(pattern).slice(0, 70))
      continue
    }
    source = source.replace(pattern, replacement)
  }
  if (source !== before) {
    fs.writeFileSync(file, source, 'utf8')
    console.log('  patched', file)
  }
}

// ---- SearchResults: no pending rows, no fetching, no peek -------------
patch('src/client/SearchResults.tsx', [
  // whole component body: replace fetching/pending/peek with a plain list
  ['  const peekTimer = useRef<number | null>(null)\n  const cache = useRef(new Map<string, string[]>())',
   '  const peekTimer = useRef<number | null>(null)\n  const cache = useRef(new Map<string, string[]>())'],
])

// simpler: rewrite the parts that matter with targeted removals
let shared = fs.readFileSync('src/client/SearchResults.tsx', 'utf8')
const EOL = shared.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

// 1. remove the pending state
shared = shared.replace(
  J(['  /** Sessions whose extra hits are still being fetched. */', '  const [pending, setPending] = useState<Record<string, true>>({})', '']),
  '',
)

// 2. remove the fetch effect entirely
const effectStart = shared.indexOf('  // Every match of a conversation, loaded once, in the background.')
const effectEnd = shared.indexOf('  const schedulePeek = (')
if (effectStart >= 0 && effectEnd > effectStart) {
  shared = shared.slice(0, effectStart) + shared.slice(effectEnd)
}

// 3. remove the inline shimmer block
const shimmerStart = shared.indexOf("            {pending[hit.sessionId] === true")
if (shimmerStart >= 0) {
  const shimmerEnd = shared.indexOf('            {blocks.map((block, index) => {')
  if (shimmerEnd > shimmerStart) {
    shared = shared.slice(0, shimmerStart) + shared.slice(shimmerEnd)
  }
}
fs.writeFileSync('src/client/SearchResults.tsx', shared, 'utf8')
console.log('  cleaned SearchResults fetches/shimmer')

// ---- callers: stop passing the (now unused) fetchers ------------------
patch('src/client/MapCanvas.tsx', [
  ['                  onFetchContext={props.onFetchContext}', '']
])
patch('src/client/StackDrawer.tsx', [
  ['                  onOpenSession={(sessionId, q) => { props.onOpenSession?.(sessionId, q) }}',
   '                  onOpenSession={(sessionId, q) => { props.onOpenSession?.(sessionId, q) }}'],
])

console.log('done')
