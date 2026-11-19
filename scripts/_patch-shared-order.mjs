import fs from 'node:fs'

// ── StatusRail：优先用共享排序（优先级 → 组内手动序 → 时间） ───────────────
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './queue-order.ts'")) {
    t = t.replace(
      "import { t } from './i18n.ts'",
      "import { t } from './i18n.ts'\nimport { sortQueueRows } from './queue-order.ts'",
    )
  }
  const lines = t.split('\n')
  const at = lines.findIndex(l => l.includes('const byId = new Map(props.entries.map(entry => [entry.cardId, entry]))'))
  if (at < 0) throw new Error('ordered body missing')
  let end = at
  while (end < lines.length && !lines[end].includes('return [...rows, ...drafts]')) end += 1
  if (end >= lines.length) throw new Error('ordered tail missing')
  const indent = lines[at].match(/^\s*/)[0]
  lines.splice(at, end - at + 1,
    ...[
      "const byId = new Map(props.entries.map(entry => [entry.cardId, entry]))",
      "// Drag position only orders cards inside their own priority bucket.",
      "const manualIndex = (cardId: string): number => {",
      "  const index = order.indexOf(cardId)",
      "  return index < 0 ? Number.MAX_SAFE_INTEGER : index",
      "}",
      "return sortQueueRows(props.entries.map(entry => ({",
      "  ...entry,",
      "  manualIndex: manualIndex(entry.cardId),",
      "})))",
    ].map(l => indent + l),
  )
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('StatusRail: shared ordering')
}

// ── SidebarQueue：同一套排序 ─────────────────────────────────────────────
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './queue-order.ts'")) {
    t = t.replace(
      "import { sessionActivity } from './session-activity.ts'",
      "import { sortQueueRows } from './queue-order.ts'\nimport { sessionActivity } from './session-activity.ts'",
    )
  }
  const lines = t.split('\n')
  const at = lines.findIndex(l => l.includes('out.sort((a, b) => {'))
  if (at < 0) throw new Error('sidebar sort missing')
  let end = at
  while (end < lines.length && !lines[end].trim().startsWith('})')) end += 1
  if (end >= lines.length) throw new Error('sidebar sort tail missing')
  const indent = lines[at].match(/^\s*/)[0]
  lines.splice(at, end - at + 1,
    indent + '// Same rule as the map rail: priority bucket first, then newest inside it.',
    indent + 'return sortQueueRows(out)',
  )
  // 后面的 `return out` 变成多余
  const outReturn = lines.findIndex((l, i) => i > at && l.trim() === 'return out')
  if (outReturn >= 0) lines.splice(outReturn, 1)
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('SidebarQueue: shared ordering')
}
