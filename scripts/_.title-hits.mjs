/** Title matching in both searches (we already hold every title client-side). */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- map-state: expose the title table --------------------------------
let state = fs.readFileSync('src/client/map-state.ts', 'utf8')
if (!state.includes('export function allSessionTitles')) {
  state += J([
    '',
    '/** Every known conversation title (search matches these too). */',
    'export function allSessionTitles(): { sessionId: string; title: string }[] {',
    '  const services = getServices()',
    '  if (services === undefined) return []',
    '  try {',
    '    const snapshot = services.sessions.list().getSnapshot()',
    '    return Object.entries(snapshot.byId)',
    '      .map(([sessionId, row]) => ({ sessionId, title: (row as { displayTitle?: string }).displayTitle ?? \'\' }))',
    '      .filter(entry => entry.title !== \'\')',
    '  } catch {',
    '    return []',
    '  }',
    '}',
    '',
  ])
}
fs.writeFileSync('src/client/map-state.ts', state, 'utf8')

// ---- MapCanvas: title hits inside one workspace ------------------------
let canvas = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
canvas = canvas.replace(
  J([
    '    const found = await searchSessions(query, cwd)',
    '    return found.slice(0, 12).map(toHitView)',
  ]),
  J([
    '    const found = await searchSessions(query, cwd)',
    '    const views = found.slice(0, 12).map(toHitView)',
    '    const needle = query.trim().toLowerCase()',
    '    const already = new Set(views.map(view => view.sessionId))',
    '    // Titles are matched here, not on the Host: the board already knows them.',
    '    const byTitle = allSessionTitles()',
    '      .filter(entry => !already.has(entry.sessionId))',
    '      .filter(entry => sessionWs.get(entry.sessionId) === groupId)',
    '      .filter(entry => entry.title.toLowerCase().includes(needle))',
    '      .map(entry => ({',
    '        sessionId: entry.sessionId,',
    '        title: entry.title,',
    '        blocks: [[entry.title]],',
    '        seqs: [null],',
    '        roles: [null],',
    '        byTitle: true,',
    '      }))',
    '    return [...byTitle, ...views]',
  ]),
)
if (!canvas.includes("import { sessionTitle") && !canvas.includes('allSessionTitles')) {
  canvas = canvas.replace(
    "import { setTitleResolver } from './map-state.ts'",
    "import { allSessionTitles, setTitleResolver } from './map-state.ts'",
  )
}
fs.writeFileSync('src/client/MapCanvas.tsx', canvas, 'utf8')

// ---- GlobalSearch: title hits across everything ------------------------
let global = fs.readFileSync('src/client/GlobalSearch.tsx', 'utf8')
global = global.replace(
  "import { mapUi, sessionTitle } from './map-state.ts'",
  "import { allSessionTitles, mapUi, sessionTitle } from './map-state.ts'",
)
global = global.replace(
  J([
    '      setHits(views)',
  ]),
  J([
    '      const needle = trimmed.toLowerCase()',
    '      const already = new Set(views.map(view => view.sessionId))',
    '      const byTitle = allSessionTitles()',
    '        .filter(entry => !already.has(entry.sessionId))',
    '        .filter(entry => entry.title.toLowerCase().includes(needle))',
    '        .map(entry => ({',
    '          sessionId: entry.sessionId,',
    '          title: entry.title,',
    '          blocks: [[entry.title]],',
    '          seqs: [null],',
    '          roles: [null],',
    '          byTitle: true,',
    '        }))',
    '      const merged = [...byTitle, ...views]',
    '      setHits(merged)',
  ]),
)
global = global.replace('      saveSearch(GLOBAL_SCOPE, { query: trimmed, hits: views })', '      saveSearch(GLOBAL_SCOPE, { query: trimmed, hits: merged })')
fs.writeFileSync('src/client/GlobalSearch.tsx', global, 'utf8')

// ---- i18n --------------------------------------------------------------
let i18n = fs.readFileSync('src/client/i18n.ts', 'utf8')
i18n = i18n.replace("  'stack.roleAgent': 'AI',", "  'stack.roleAgent': 'AI',\n  'stack.titleHit': '标题命中',")
i18n = i18n.replace("  'stack.roleAgent': 'AI',", "  'stack.roleAgent': 'AI',") // no-op for en below
i18n = i18n.replace("  'stack.agentSub': 'sub-agent',", "  'stack.agentSub': 'sub-agent',\n  'stack.titleHit': 'title match',")
fs.writeFileSync('src/client/i18n.ts', i18n, 'utf8')

console.log('title hits wired')
