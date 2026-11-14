import fs from 'node:fs'
import zlib from 'node:zlib'
const text = zlib.zstdDecompressSync(fs.readFileSync(process.env.PROBE_LOG)).toString('utf8')
const recs = text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const pick = (type) => recs.filter(r => r.type === type)
const shape = (obj, depth = 0) => {
  if (obj === null || typeof obj !== 'object') return typeof obj
  if (Array.isArray(obj)) return `[${obj.length}] ` + (obj.length > 0 ? shape(obj[0], depth + 1) : '')
  return '{' + Object.keys(obj).slice(0, 14).map(k => `${k}:${shape(obj[k], depth + 1)}`).join(', ') + '}'
}
for (const type of ['request/header', 'request/context', 'compaction/prune']) {
  const list = pick(type)
  if (list.length === 0) { console.log(type, 'none'); continue }
  const last = list[list.length - 1]
  console.log('====', type, 'count', list.length, 'seq', last.seq)
  console.log(shape(last.data).slice(0, 900))
}
