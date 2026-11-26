import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'
const root = join(process.env.USERPROFILE, '.dsh', 'sessions')
const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (entry.name === 'session.v4.jsonl.zstd') files.push({ p, size: statSync(p).size })
  }
}
walk(root)
files.sort((a, b) => b.size - a.size)
for (const f of files.slice(0, 3)) {
  const raw = readFileSync(f.p)
  const t0 = process.hrtime.bigint()
  const plain = zstdDecompressSync(raw)
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  const lines = plain.toString('utf8').split('\n').length
  console.log(`${(f.size/1048576).toFixed(1)} MB zstd → ${(plain.length/1048576).toFixed(1)} MB / ${lines} 行，解压 ${ms.toFixed(0)}ms`)
}
console.log('会话日志总数', files.length)
