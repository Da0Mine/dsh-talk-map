import fs from 'node:fs'
import zlib from 'node:zlib'
const text = zlib.zstdDecompressSync(fs.readFileSync(process.env.PROBE_LOG)).toString('utf8')
const recs = text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const kinds = new Map()
for (const r of recs) {
  if (r.type !== 'user/message' && r.type !== 'assistant/message') continue
  const sk = r.data?.source?.kind ?? r.data?.message?.source?.kind ?? 'user'
  kinds.set(sk, (kinds.get(sk) ?? 0) + 1)
}
console.log('user/assistant source kinds:', JSON.stringify([...kinds.entries()].sort((a,b)=>b[1]-a[1])))
// 找 text 里含「压缩/摘要/summary」痕迹的长 user 消息
const suspects = recs.filter(r => {
  const content = r.data?.content ?? r.data?.message?.content
  if (!Array.isArray(content)) return false
  const t = content.filter(b => b && b.type === 'text').map(b => b.text).join(' ')
  return /compact|压缩|summary of the conversation|摘要如下/i.test(t.slice(0, 400))
})
console.log('疑似压缩摘要记录数:', suspects.length)
suspects.slice(-2).forEach(r => {
  const t = (r.data?.content ?? r.data?.message?.content).filter(b => b && b.type === 'text').map(b => b.text).join(' ')
  console.log('  seq', r.seq, 'type', r.type, 'source', r.data?.source?.kind ?? null, 'chars', t.length, '| head:', t.slice(0, 120).replace(/\s+/g, ' '))
})
