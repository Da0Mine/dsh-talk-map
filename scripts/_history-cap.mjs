import fs from 'node:fs'
// state-persist：历史最多保留 30 条（按时间取最新）
const f = 'src/client/state-persist.ts'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('MAX_HISTORY')) {
  t = t.replace(
    `function prune(record: Record<string, number>, now: number): Record<string, number> {`,
    `/** Newest N only: the rail pages through at most this many finished tasks. */
const MAX_HISTORY = 30

function pruneHistory(record: Record<string, number>, now: number): Record<string, number> {
  const fresh = Object.entries(record)
    .filter(([, at]) => typeof at === 'number' && now - at < MAX_AGE_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_HISTORY)
  return Object.fromEntries(fresh)
}

function prune(record: Record<string, number>, now: number): Record<string, number> {`,
  )
  t = t.replace(`    history: prune(parsed.history ?? {}, now),`, `    history: pruneHistory(parsed.history ?? {}, now),`)
  t = t.replace(
    `    history: patch.history ?? base.history,`,
    `    history: patch.history === undefined ? base.history : pruneHistory(patch.history, Date.now()),`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('state-persist: 历史最多 30 条')
}
