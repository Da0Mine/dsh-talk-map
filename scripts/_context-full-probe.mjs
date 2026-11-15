import fs from 'node:fs'
import zlib from 'node:zlib'
const text = zlib.zstdDecompressSync(fs.readFileSync(process.env.PROBE_LOG)).toString('utf8')
const recs = text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const textOfBlocks = (c) => Array.isArray(c) ? c.filter(b => b && b.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n') : ''
const pruned = new Set()
for (const r of recs) if (r.type === 'compaction/prune' && Array.isArray(r.data?.shadowedSeqs)) for (const s of r.data.shadowedSeqs) if (typeof s === 'number') pruned.add(s)
const lines = []
let checkpoints = 0
for (const r of recs) {
  if (typeof r.seq === 'number' && pruned.has(r.seq)) continue
  if (r.type === 'user/message') {
    const t = textOfBlocks(r.data?.content); if (!t) continue
    const kind = r.data?.source?.kind
    if (kind === 'compact-checkpoint') { checkpoints += 1; lines.push('COMPACTED HISTORY (summary): ' + t) }
    else lines.push((typeof kind === 'string' && kind !== 'user' ? 'USER/' + kind : 'USER') + ': ' + t)
  } else if (r.type === 'assistant/message') {
    const t = textOfBlocks(r.data?.message?.content); if (t) lines.push('ASSISTANT: ' + t)
  } else if (r.type === 'tool/call') {
    let a = ''; try { a = JSON.stringify(r.data?.arguments ?? r.data?.input ?? {}) } catch {}
    lines.push('TOOL ' + (r.data?.name ?? r.data?.toolName ?? 'tool') + '(' + a.slice(0, 160) + ')')
  } else if (r.type === 'tool/result') {
    const t = textOfBlocks(r.data?.content) || (typeof r.data?.output === 'string' ? r.data.output : '')
    if (t) lines.push('RESULT: ' + (t.length > 240 ? t.slice(0, 240) + '…' : t))
  }
}
const all = lines.join('\n\n')
console.log(JSON.stringify({
  records: recs.length,
  prunedRecords: pruned.size,
  compactedHistoryCheckpoints: checkpoints,
  lines: lines.length,
  chars: all.length,
  approxTokens: Math.round(all.length / 2),
  megabytes: +(all.length / 1024 / 1024).toFixed(2),
}, null, 1))
