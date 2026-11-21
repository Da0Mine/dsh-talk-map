/** Line-based version: cap import/sync and the preview batch (issues #2, #6). */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const touched = []

// 1) constants before placeableSessionIds' doc comment
const docAt = lines.findIndex(l => l.includes('/** Sessions eligible for a card: top-level, non-empty logs. */'))
if (docAt < 0) throw new Error('placeableSessionIds doc missing')
if (!lines.some(l => l.includes('const IMPORT_CAP'))) {
  lines.splice(docAt, 0,
    '/**',
    ' * How many cards one click may place at once. A workspace with ~1000 sessions used to dump',
    ' * all of them onto the canvas (issue #2); the newest ones are the useful ones and the rest',
    ' * can be pulled in with the next import.',
    ' */',
    'const IMPORT_CAP = 120',
    '/** Card previews requested per poll tick (one Host read per session). */',
    'const PREVIEW_BATCH = 40',
    '',
  )
  touched.push('constants')
}

// 2) importWorkspace: rename + cap
const memberAt = lines.findIndex(l => l.includes('const memberSessions = placeableSessionIds(sessions, archivedSessionIds)'))
if (memberAt < 0) throw new Error('memberSessions line missing')
const indent = lines[memberAt].match(/^\s*/)[0]
lines[memberAt] = indent + 'const allMembers = placeableSessionIds(sessions, archivedSessionIds)'
// 在 sort 行之后插入 cap 两行（sort 行就是 memberAt+2）
const sortAt = memberAt + 2
if (!lines[sortAt].includes('.sort(')) throw new Error('sort line not where expected: ' + lines[sortAt])
lines.splice(sortAt + 1, 0,
  indent + '// Newest first, and never more than IMPORT_CAP in one go (issue #2).',
  indent + 'const memberSessions = allMembers.slice(0, IMPORT_CAP)',
  indent + 'const skipped = allMembers.length - memberSessions.length',
)
touched.push('importWorkspace cap')

// 3) toast after the frame is set inside importWorkspace
const clampAt = lines.findIndex((l, i) => i > memberAt && l.includes('canvas.setWsFrameRect(workspaceId, rect)'))
if (clampAt < 0) throw new Error('importWorkspace tail missing')
const tailIndent = lines[clampAt].match(/^\s*/)[0]
lines.splice(clampAt + 1, 0,
  tailIndent + 'if (skipped > 0) {',
  tailIndent + "  showToast(t('toast.importCapped', { n: String(placed.length), more: String(skipped) }))",
  tailIndent + '}',
)
touched.push('import toast')

// 4) syncGroup: cap
const syncAt = lines.findIndex((l, i) => i > clampAt && l.includes('const fresh = placeableSessionIds(sessions, archivedSessionIds)'))
if (syncAt < 0) throw new Error('syncGroup fresh missing')
let syncSort = syncAt
while (syncSort < syncAt + 6 && !lines[syncSort].includes('.sort(')) syncSort += 1
if (syncSort >= syncAt + 6) throw new Error('syncGroup sort missing')
lines[syncSort] = lines[syncSort].replace(/\)$/, ')\n' + (lines[syncSort].match(/^\s*/)[0]) + '  .slice(0, IMPORT_CAP)')
touched.push('syncGroup cap')

// 5) preview batch
const pendingAt = lines.findIndex(l => l.includes('if (pending.length === 0) return'))
if (pendingAt < 0) throw new Error('preview pending check missing')
const pIndent = lines[pendingAt].match(/^\s*/)[0]
lines[pendingAt] = [
  pIndent + 'if (pending.length === 0) return',
  pIndent + '// Ask for the newest PREVIEW_BATCH only; the rest arrive on later ticks, and a board',
  pIndent + '// with a thousand cards must not fire a thousand session reads at once (issue #6).',
  pIndent + 'const batch = pending.slice(0, PREVIEW_BATCH)',
  pIndent + 'const batchStamps = stamps.slice(0, PREVIEW_BATCH)',
].join('\n')
const stampLoop = lines.findIndex(l => l.includes('for (const [sessionId, stamp] of stamps) previewStamp.current.set(sessionId, stamp)'))
if (stampLoop < 0) throw new Error('stamp loop missing')
lines[stampLoop] = lines[stampLoop].replace('of stamps', 'of batchStamps')
const fetchAt = lines.findIndex(l => l.includes('void talkMapApi.lastUserMessages(pending)'))
if (fetchAt < 0) throw new Error('lastUserMessages call missing')
lines[fetchAt] = lines[fetchAt].replace('lastUserMessages(pending)', 'lastUserMessages(batch)')
touched.push('preview batch')

fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('patched:', touched.join(', '))
