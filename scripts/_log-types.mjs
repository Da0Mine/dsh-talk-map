import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = path.join(process.env.USERPROFILE, '.dsh', 'sessions')
const dirs = fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).slice(0, 40) : []
let found = null
for (const d of dirs) {
  const dir = path.join(root, d.name)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.zstd') || f.endsWith('.jsonl.zstd'))
  if (files.length > 0) { found = path.join(dir, files[0]); break }
}
if (found === null) { console.log('no session log found'); process.exit(0) }
const buf = fs.readFileSync(found)
const text = zlib.zstdDecompressSync(buf).toString('utf8')
const lines = text.split('\n').filter(Boolean)
const types = new Map()
for (const line of lines) {
  try { const rec = JSON.parse(line); const t = rec.type ?? rec.kind ?? rec.event ?? '?'; types.set(t, (types.get(t) ?? 0) + 1) } catch {}
}
console.log('file:', path.basename(found), 'records:', lines.length)
console.log('types:', JSON.stringify([...types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)))
