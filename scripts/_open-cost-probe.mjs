import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = path.join(process.env.USERPROFILE, '.dsh', 'sessions')
const files = []
const walk = (dir, depth = 0) => {
  if (depth > 3) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, depth + 1)
    else if (entry.name.endsWith('.zstd')) files.push(full)
  }
}
walk(root)
const sized = files.map(f => ({ f, size: fs.statSync(f).size })).sort((a, b) => b.size - a.size)
const sample = [sized[0], sized[Math.floor(sized.length / 2)], sized[sized.length - 1]].filter(Boolean)
for (const item of sample) {
  const t0 = performance.now()
  const raw = zlib.zstdDecompressSync(fs.readFileSync(item.f))
  const t1 = performance.now()
  const lines = raw.toString('utf8').split('\n').filter(Boolean)
  const t2 = performance.now()
  let records = 0
  for (const line of lines) { try { JSON.parse(line); records += 1 } catch {} }
  const t3 = performance.now()
  console.log(JSON.stringify({
    file: path.basename(path.dirname(item.f)),
    zstdMB: +(item.size / 1024 / 1024).toFixed(2),
    plainMB: +(raw.length / 1024 / 1024).toFixed(2),
    records,
    decompressMs: Math.round(t1 - t0),
    splitMs: Math.round(t2 - t1),
    parseMs: Math.round(t3 - t2),
  }))
}
