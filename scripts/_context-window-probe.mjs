import fs from 'node:fs'
import zlib from 'node:zlib'

const text = zlib.zstdDecompressSync(fs.readFileSync(process.env.PROBE_LOG)).toString('utf8')
const recs = text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const textOfBlocks = (content) => Array.isArray(content)
  ? content.filter(b => b && b.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n')
  : ''

// 1) 压缩丢掉哪些记录
const pruned = new Set()
for (const r of recs) {
  if (r.type !== 'compaction/prune') continue
  const seqs = r.data?.shadowedSeqs
  if (Array.isArray(seqs)) for (const s of seqs) if (typeof s === 'number') pruned.add(s)
}

// 2) 只保留仍在上下文里的
const lines = []
for (const r of recs) {
  if (typeof r.seq === 'number' && pruned.has(r.seq)) continue
  if (r.type === 'user/message') { const t = textOfBlocks(r.data?.content); if (t) lines.push('USER: ' + t) }
  else if (r.type === 'assistant/message') { const t = textOfBlocks(r.data?.message?.content); if (t) lines.push('ASSISTANT: ' + t) }
  else if (r.type === 'tool/call') { let a = ''; try { a = JSON.stringify(r.data?.arguments ?? r.data?.input ?? {}) } catch {} lines.push('TOOL ' + (r.data?.name ?? r.data?.toolName ?? 'tool') + '(' + a.slice(0, 160) + ')') }
  else if (r.type === 'tool/result') { const t = textOfBlocks(r.data?.content) || (typeof r.data?.output === 'string' ? r.data.output : ''); if (t) lines.push('RESULT: ' + (t.length > 240 ? t.slice(0, 240) + '…' : t)) }
}
const out = lines.join('\n\n')
const byRole = lines.reduce((acc, l) => { const k = l.split(':')[0].split(' ')[0]; acc[k] = (acc[k] ?? 0) + 1; return acc }, {})
console.log(JSON.stringify({
  records: recs.length,
  prunedRecords: pruned.size,
  entries: lines.length,
  byRole,
  chars: out.length,
  approxTokens: Math.round(out.length / 2),
  cappedAt60000: out.length > 60000,
}, null, 1))
