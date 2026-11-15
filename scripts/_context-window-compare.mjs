import fs from 'node:fs'
import zlib from 'node:zlib'
const text = zlib.zstdDecompressSync(fs.readFileSync(process.env.PROBE_LOG)).toString('utf8')
const recs = text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const textOfBlocks = (c) => Array.isArray(c) ? c.filter(b => b && b.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n') : ''
const checkpoints = recs.filter(r => r.type === 'user/message' && r.data?.source?.kind === 'compact-checkpoint')
console.log('checkpoint seqs:', JSON.stringify(checkpoints.map(r => r.seq)))
const lastSeq = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].seq : 0
const render = (fromSeq) => {
  const lines = []
  for (const r of recs) {
    if (typeof r.seq === 'number' && r.seq <= fromSeq) continue
    if (r.type === 'user/message') { const t = textOfBlocks(r.data?.content); if (t) lines.push('USER: ' + t) }
    else if (r.type === 'assistant/message') { const t = textOfBlocks(r.data?.message?.content); if (t) lines.push('ASSISTANT: ' + t) }
    else if (r.type === 'tool/call') { let a=''; try { a = JSON.stringify(r.data?.arguments ?? r.data?.input ?? {}) } catch {} lines.push('TOOL ' + (r.data?.name ?? r.data?.toolName ?? 'tool') + '(' + a.slice(0,160) + ')') }
    else if (r.type === 'tool/result') { const t = textOfBlocks(r.data?.content) || (typeof r.data?.output === 'string' ? r.data.output : ''); if (t) lines.push('RESULT: ' + (t.length > 240 ? t.slice(0,240) + '…' : t)) }
  }
  const all = lines.join('\n\n')
  return { fromSeq, lines: lines.length, chars: all.length, approxTokens: Math.round(all.length / 2) }
}
console.log('A) 最后一次压缩检查点之后:', JSON.stringify(render(lastSeq)))
console.log('B) 全量（不截断）:', JSON.stringify(render(0)))
const cp = checkpoints[checkpoints.length - 1]
const cpText = textOfBlocks(cp?.data?.content)
console.log('最后一个 checkpoint 摘要长度:', cpText.length, '| head:', cpText.slice(0, 140).replace(/\s+/g, ' '))
