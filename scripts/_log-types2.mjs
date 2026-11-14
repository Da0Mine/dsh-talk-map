import fs from 'node:fs'
import zlib from 'node:zlib'
const file = process.env.PROBE_LOG
const text = zlib.zstdDecompressSync(fs.readFileSync(file)).toString('utf8')
const lines = text.split('\n').filter(Boolean)
const types = new Map()
for (const line of lines) {
  try { const rec = JSON.parse(line); const t = rec.type ?? rec.kind ?? rec.event ?? '?'; types.set(t, (types.get(t) ?? 0) + 1) } catch {}
}
console.log('records:', lines.length)
console.log(JSON.stringify([...types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 26)))
