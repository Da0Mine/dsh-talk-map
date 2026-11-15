import fs from 'node:fs'
import zlib from 'node:zlib'
const text = zlib.zstdDecompressSync(fs.readFileSync(process.env.PROBE_LOG)).toString('utf8')
const recs = text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const textOfBlocks = (c) => Array.isArray(c) ? c.filter(b => b && b.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n') : ''
const pruned = new Set()
for (const r of recs) if (r.type === 'compaction/prune' && Array.isArray(r.data?.shadowedSeqs)) for (const s of r.data.shadowedSeqs) if (typeof s === 'number') pruned.add(s)
const lines = []
for (const r of recs) {
  if (typeof r.seq === 'number' && pruned.has(r.seq)) continue
  if (r.type === 'user/message') { const t = textOfBlocks(r.data?.content); if (t) lines.push('USER: ' + t) }
  else if (r.type === 'assistant/message') { const t = textOfBlocks(r.data?.message?.content); if (t) lines.push('ASSISTANT: ' + t) }
  else if (r.type === 'tool/call') { let a = ''; try { a = JSON.stringify(r.data?.arguments ?? r.data?.input ?? {}) } catch {} lines.push('TOOL ' + (r.data?.name ?? r.data?.toolName ?? 'tool') + '(' + a.slice(0, 160) + ')') }
  else if (r.type === 'tool/result') { const t = textOfBlocks(r.data?.content) || (typeof r.data?.output === 'string' ? r.data.output : ''); if (t) lines.push('RESULT: ' + (t.length > 240 ? t.slice(0, 240) + '…' : t)) }
}
const essential = lines.filter(l => !l.startsWith('TOOL ') && !l.startsWith('RESULT: '))
const tooling = lines.filter(l => l.startsWith('TOOL ') || l.startsWith('RESULT: '))
const e = essential.join('\n\n').length, t = tooling.join('\n\n').length, total = e + t
const pick = (budget) => {
  let out = essential.join('\n\n')
  if (out.length > budget) return budget
  const room = budget - out.length
  let used = 0
  for (let i = tooling.length - 1; i >= 0; i -= 1) { const l = tooling[i]; if (used + l.length + 2 > room) break; used += l.length + 2 }
  return out.length + used
}
console.log(JSON.stringify({
  prunedRecords: pruned.size,
  essentialChars: e, toolChars: t, availableChars: total,
  essentialApproxTokens: Math.round(e / 2),
  fits40k: pick(40000), fits300k: pick(300000), fits600k: pick(600000), fitsAll: pick(3000000),
}, null, 1))
