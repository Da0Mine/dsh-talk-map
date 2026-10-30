/** Read-only: validate the one session the user poisoned, and report its state. */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ROOT = path.join(process.env.USERPROFILE ?? '', '.dsh', 'sessions')
const TITLE = 'Scientific WorkPlace'

function decompress(file) {
  const buffer = fs.readFileSync(file)
  const parts = []
  let offset = 0
  while (offset < buffer.length) {
    const start = buffer.indexOf(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]), offset)
    if (start < 0) break
    const next = buffer.indexOf(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]), start + 4)
    const end = next < 0 ? buffer.length : next
    try { parts.push(zlib.zstdDecompressSync(buffer.subarray(start, end))) } catch { /* frame */ }
    offset = end
  }
  return Buffer.concat(parts).toString('utf8')
}

function walk(dir, out = []) {
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name === 'session.v4.jsonl.zstd') out.push(full)
  }
  return out
}

const candidates = []
for (const file of walk(ROOT)) {
  let text = ''
  try { text = decompress(file) } catch { continue }
  if (!text.includes(TITLE)) continue
  const lines = text.split('\n').filter(line => line !== '')
  const bad = lines.filter(line => line.includes('"source":{"kind":"plugin"') || line.includes('"kind":"plugin"'))
  candidates.push({ file, lines: lines.length, bad: bad.length, bytes: fs.statSync(file).size })
}

candidates.sort((a, b) => b.lines - a.lines)
for (const entry of candidates.slice(0, 6)) {
  console.log(entry.lines, 'records | bad:', entry.bad, '|', entry.bytes, 'bytes |', entry.file)
}
console.log('total candidates:', candidates.length)
