import fs from 'node:fs'
import zlib from 'node:zlib'
const text = zlib.zstdDecompressSync(fs.readFileSync(process.env.PROBE_LOG)).toString('utf8')
const recs = text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const of = (type) => recs.filter(r => r.type === type)
const brief = (r) => {
  const d = r.data ?? {}
  const src = d.source?.kind ?? d.message?.source?.kind ?? null
  const content = d.content ?? d.message?.content
  const txt = Array.isArray(content) ? content.filter(b => b && b.type === 'text').map(b => b.text).join(' ') : ''
  return { seq: r.seq, sourceKind: src, chars: txt.length, head: txt.slice(0, 100).replace(/\s+/g, ' ') }
}
for (const type of ['system/message', 'developer/message', 'compaction/prune']) {
  const list = of(type)
  console.log('====', type, 'count', list.length)
  list.slice(-2).forEach(r => console.log('  ', JSON.stringify(brief(r)).slice(0, 260)))
}
// 有没有专门的压缩摘要记录
const kinds = new Set()
for (const r of recs) if (r.type === 'system/message' || r.type === 'developer/message') kinds.add((r.data?.source?.kind ?? r.data?.message?.source?.kind ?? '?') + ' @' + r.type)
console.log('system/developer source kinds:', JSON.stringify([...kinds]))
