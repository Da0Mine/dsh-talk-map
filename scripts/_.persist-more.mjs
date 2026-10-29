/** Persist the extra per-session hits so reopening does not refetch them. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- search-store: carry the merged per-session hits -------------------
let store = fs.readFileSync('src/client/search-store.ts', 'utf8')
store = store.replace(
  J([
    'export interface StoredSearch<T> {',
    '  query: string',
    '  hits: T[]',
    '  at: number',
    '}',
  ]),
  J([
    '/** Every extra hit fetched for a session (shape owned by the caller). */',
    'export type StoredMore = Record<string, unknown>',
    '',
    'export interface StoredSearch<T> {',
    '  query: string',
    '  hits: T[]',
    '  /** Extra per-session hits already loaded — do not fetch them again. */',
    '  more?: StoredMore',
    '  at: number',
    '}',
  ]),
)
store = store.replace(
  'export function saveSearch<T>(scope: string, value: { query: string; hits: T[] }): void {',
  'export function saveSearch<T>(scope: string, value: { query: string; hits: T[]; more?: StoredMore }): void {',
)
fs.writeFileSync('src/client/search-store.ts', store, 'utf8')

// ---- SearchResults: seed + persist `more` ------------------------------
let shared = fs.readFileSync('src/client/SearchResults.tsx', 'utf8')
shared = shared.replace(
  "import { t } from './i18n.ts'",
  "import { t } from './i18n.ts'\nimport { loadSearch, saveSearch } from './search-store.ts'",
)
shared = shared.replace(
  J([
    'export interface SearchResultsProps {',
    '  query: string',
  ]),
  J([
    'export interface SearchResultsProps {',
    '  query: string',
    '  /** Where to remember the loaded extra hits (one per surface). */',
    '  storageScope?: string',
  ]),
)
shared = shared.replace(
  '  const [more, setMore] = useState<Record<string, { blocks: string[][]; seqs: (number | null)[] }>>({})',
  J([
    '  const remembered = props.storageScope === undefined ? null : loadSearch<SearchHitView>(props.storageScope)',
    '  const [more, setMore] = useState<Record<string, { blocks: string[][]; seqs: (number | null)[] }>>(',
    '    (remembered?.more ?? {}) as Record<string, { blocks: string[][]; seqs: (number | null)[] }>,',
    '  )',
  ]),
)
// persist whenever the extra hits change
shared = shared.replace(
  '  const schedulePeek = (',
  J([
    '  // Remember the extra hits: reopening the search must not refetch them.',
    '  useEffect(() => {',
    "    if (props.storageScope === undefined) return",
    '    if (Object.keys(more).length === 0) return',
    "    saveSearch(props.storageScope, { query: props.query, hits: props.hits, more })",
    '  }, [more, props.hits, props.query, props.storageScope])',
    '',
    '  const schedulePeek = (',
  ]),
)
fs.writeFileSync('src/client/SearchResults.tsx', shared, 'utf8')

// ---- pass the scope from both surfaces --------------------------------
let global = fs.readFileSync('src/client/GlobalSearch.tsx', 'utf8')
global = global.replace('                  query={submitted === \'\' ? query : submitted}', "                  query={submitted === '' ? query : submitted}\n                  storageScope={GLOBAL_SCOPE}")
fs.writeFileSync('src/client/GlobalSearch.tsx', global, 'utf8')

let drawer = fs.readFileSync('src/client/StackDrawer.tsx', 'utf8')
drawer = drawer.replace(
  '                  query={query}',
  "                  query={query}\n                  storageScope={'drawer:' + props.groupId}",
)
fs.writeFileSync('src/client/StackDrawer.tsx', drawer, 'utf8')

console.log('extra hits persisted')
