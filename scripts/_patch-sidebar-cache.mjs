/**
 * The sidebar re-asked the Host for 14 card bodies every time it mounted, even though the map
 * already persists the same texts (preview-cache.ts, 300 entries in localStorage keyed by the
 * session's updatedAt). Reuse it: seed the state, skip rows whose stamp still matches, and write
 * back so the map benefits too.
 */
import fs from 'node:fs'

const file = 'src/client/SidebarQueue.tsx'
let text = fs.readFileSync(file, 'utf8')
const edits = []

// 1) imports
if (!text.includes("from './preview-cache.ts'")) {
  const anchor = text.split('\n').find(line => line.includes("from './draft-watch.ts'"))
  if (anchor === undefined) throw new Error('draft-watch import anchor missing')
  text = text.replace(anchor, anchor + "\nimport { loadPreviewCache, putPreview, readPreviewTexts } from './preview-cache.ts'")
  edits.push('import')
}

// 2) seed state from the persisted cache
text = text.replace(
  '  const [previews, setPreviews] = useState<Record<string, string>>({})',
  '  // Same persisted cache the map writes: a card that has not moved renders instantly.\n' +
  '  const [previews, setPreviews] = useState<Record<string, string>>(readPreviewTexts)',
)
edits.push('seed')

// 3) stamp bookkeeping next to askedRef
if (!text.includes('cachedStamp')) {
  text = text.replace(
    /(\s+const askedRef = useRef<Set<string>>\([^\n]*\)\n)/,
    `$1  /** \`updatedAt\` the cached text belongs to; a match means no Host read is needed. */\n  const cachedStamp = useRef<Map<string, number>>(\n    new Map(Object.entries(loadPreviewCache())\n      .filter(([, entry]) => typeof entry?.text === 'string' && entry.text !== '')\n      .map(([sessionId, entry]) => [sessionId, entry.stamp])),\n  )\n`,
  )
  edits.push('cachedStamp')
}

// 4) skip rows that the cache already covers, and write results back
const before = `    const wanted = rows
      .slice(0, PREVIEW_LIMIT)
      .filter(row => !askedRef.current.has(row.sessionId))
      .map(row => ({ id: row.sessionId, stamp: row.updatedAt ?? 0 }))`
const after = `    const wanted = rows
      .slice(0, PREVIEW_LIMIT)
      .filter(row => !askedRef.current.has(row.sessionId))
      // A cached body that belongs to the current stamp is already on screen.
      .filter(row => cachedStamp.current.get(row.sessionId) !== (row.updatedAt ?? 0))
      .map(row => ({ id: row.sessionId, stamp: row.updatedAt ?? 0 }))`
if (!text.includes(before)) throw new Error('wanted anchor missing')
text = text.replace(before, after)
edits.push('skip cached')

const afterFetch = `      .then((page) => {
        setPreviews((current) => {
          const next = { ...current }
          for (const [id, text] of Object.entries(page.texts)) {
            if (typeof text === 'string' && text.trim() !== '') next[id] = text
          }
          return next
        })`
if (!text.includes(afterFetch)) throw new Error('fetch then anchor missing')
text = text.replace(
  afterFetch,
  `      .then((page) => {
        setPreviews((current) => {
          const next = { ...current }
          for (const [id, text] of Object.entries(page.texts)) {
            if (typeof text === 'string' && text.trim() === '') continue
            next[id] = text
            // Share the result with the map's cache (same store, same stamp key).
            const stamp = wanted.find(item => item.id === id)?.stamp
            if (stamp !== undefined) {
              putPreview(id, text, stamp)
              cachedStamp.current.set(id, stamp)
            }
          }
          return next
        })`,
)
edits.push('write back')

fs.writeFileSync(file, text, 'utf8')
console.log(edits.join(', '))
