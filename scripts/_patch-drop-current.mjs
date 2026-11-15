/**
 * Drop the rail's "current task" block entirely — only the queue list remains.
 * Removes: the JSX block, the `current` prop + type, the MapCanvas memo that fed it,
 * its CSS and its strings. The draft-body behaviour stays.
 */
import fs from 'node:fs'

// ── 1. StatusRail: remove the JSX block ────────────────────────────────────
{
  const file = 'src/client/StatusRail.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const start = lines.findIndex(l => l.trim().startsWith('{props.current !== undefined'))
  if (start < 0) throw new Error('current block start not found')
  let end = start
  while (end < lines.length && lines[end].trim() !== ': null}') end += 1
  if (end >= lines.length) throw new Error('current block end not found')
  const removed = end - start + 1
  lines.splice(start, removed)
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  console.log(`StatusRail: removed ${removed} lines of the current block`)
}

// ── 2. StatusRail: drop the prop and the type ──────────────────────────────
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    `  /** The conversation the map was opened from — the rail's "current task" block. */
  current?: StatusRailCurrent
}

export interface StatusRailCurrent {
  cardId: string
  title: string
  /** Only when it also carries a lamp (running / waiting / unread). */
  lamp?: StatusLamp
  preview?: string
  updatedAt?: number
}`,
    '}',
  )
  if (text.includes('StatusRailCurrent')) throw new Error('StatusRailCurrent still referenced')
  fs.writeFileSync(file, text, 'utf8')
  console.log('StatusRail: prop + type removed')
}

// ── 3. MapCanvas: drop the memo and the prop ───────────────────────────────
{
  const file = 'src/client/MapCanvas.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const start = lines.findIndex(l => l.includes('const currentRailEntry = useMemo'))
  if (start < 0) throw new Error('currentRailEntry memo not found')
  // walk back over the leading comment block
  let from = start
  while (from > 0 && (lines[from - 1].trim().startsWith('*') || lines[from - 1].trim().startsWith('/**'))) from -= 1
  // forward to the closing '}, [...]' line
  let end = start
  while (end < lines.length && !lines[end].trim().startsWith('}, [')) end += 1
  if (end >= lines.length) throw new Error('memo end not found')
  lines.splice(from, end - from + 1)
  // drop the prop line
  const propAt = lines.findIndex(l => l.includes('currentRailEntry !== undefined'))
  if (propAt >= 0) lines.splice(propAt, 1)
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  console.log('MapCanvas: memo + prop removed')
}

// ── 4. MapCanvas: fix the import ───────────────────────────────────────────
{
  const file = 'src/client/MapCanvas.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    "import { StatusRail, type StatusRailCurrent, type StatusRailEntry, type StatusLamp } from './StatusRail.tsx'",
    "import { StatusRail, type StatusRailEntry, type StatusLamp } from './StatusRail.tsx'",
  )
  if (text.includes('StatusRailCurrent')) throw new Error('MapCanvas still references StatusRailCurrent')
  fs.writeFileSync(file, text, 'utf8')
  console.log('MapCanvas: import fixed')
}

// ── 5. CSS ─────────────────────────────────────────────────────────────────
{
  const file = 'src/client/talk-map.module.css'
  let sheet = fs.readFileSync(file, 'utf8')
  const marker = '/* ── the rail\'s "current task" block (top) '
  const at = sheet.indexOf(marker)
  if (at >= 0) {
    const tail = sheet.slice(at)
    const nextSection = tail.indexOf('\n/* ──', 1)
    sheet = nextSection >= 0 ? sheet.slice(0, at) + tail.slice(nextSection + 1) : sheet.slice(0, at)
  }
  for (const selector of ['.statusRailCurrent {', '.statusRailCurrentHead {', '.statusRailCurrentCard {', '.statusRailCurrentCard:hover {', '.statusRailCurrentBack {']) {
    const idx = sheet.indexOf(selector)
    if (idx < 0) continue
    const close = sheet.indexOf('}', idx)
    if (close > 0) sheet = sheet.slice(0, idx) + sheet.slice(close + 1)
  }
  fs.writeFileSync(file, sheet, 'utf8')
  console.log('CSS: current block rules removed; remaining =', (sheet.match(/statusRailCurrent/g) ?? []).length)
}

// ── 6. strings ─────────────────────────────────────────────────────────────
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  for (const key of ['statusRail.current', 'statusRail.currentHint', 'statusRail.currentBack']) {
    const re = new RegExp(`^\\s*'${key.replace('.', '\\.')}':.*\\n`, 'm')
    text = text.replace(re, '')
  }
  fs.writeFileSync(file, text, 'utf8')
  console.log('i18n: current block strings removed; remaining =', (text.match(/statusRail\.current/g) ?? []).length)
}
