/** Read-only scan: find session logs with a retired `"kind":"plugin"` source. */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ROOT = path.join(process.env.USERPROFILE ?? '', '.dsh', 'sessions')

function decompress(file) {
  const buffer = fs.readFileSync(file)
  const parts = []
  let offset = 0
  while (offset < buffer.length) {
    const start = buffer.indexOf(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]), offset)
    if (start < 0) break
    const next = buffer.indexOf(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]), start + 4)
    const end = next < 0 ? buffer.length : next
    try {
      parts.push(zlib.zstdDecompressSync(buffer.subarray(start, end)))
    } catch (error) {
      console.error('frame failed at', start, String(error.message ?? error))
    }
    offset = end
  }
  return Buffer.concat(parts).toString('utf8')
}

function walk(dir, out = []) {
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name === 'session.v4.jsonl.zstd') out.push(full)
  }
  return out
}

const files = walk(ROOT)
console.log('session logs:', files.length)
let hits = 0
for (const file of files) {
  let text = ''
  try {
    text = decompress(file)
  } catch (error) {
    console.log('SKIP', file, String(error.message ?? error))
    continue
  }
  const bad = text.split('\n').filter(line => line.includes('"source":{"kind":"plugin"') || line.includes('"kind":"plugin"'))
  if (bad.length === 0) continue
  hits += 1
  const first = text.split('\n')[0]?.slice(0, 300) ?? ''
  console.log('\n=== BAD', file)
  console.log('records:', text.split('\n').length, 'bad:', bad.length)
  console.log('head:', first)
  for (const line of bad.slice(0, 3)) console.log('  bad-line:', line.slice(0, 400))
}
console.log('\nfiles with retired kind:', hits)
