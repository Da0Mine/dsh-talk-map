/**
 * What does the runtime put on a `user/message` besides the text? If injected
 * envelopes carry a distinct `source`, the card body needs one predicate instead
 * of a growing list of text patterns.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = process.argv[2]
const MAGIC = [0x28, 0xb5, 0x2f, 0xfd]

function readFrames(file) {
  const buf = fs.readFileSync(file)
  const offsets = []
  for (let i = 0; i + 4 <= buf.length; i += 1) {
    if (MAGIC.every((byte, index) => buf[i + index] === byte)) offsets.push(i)
  }
  let text = ''
  for (let index = 0; index < offsets.length; index += 1) {
    const end = index + 1 < offsets.length ? offsets[index + 1] : buf.length
    try { text += zlib.zstdDecompressSync(buf.subarray(offsets[index], end)).toString('utf8') } catch { /* skip */ }
  }
  return text
}

const byShape = new Map()
for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const file = path.join(root, dir.name, 'session.v4.jsonl.zstd')
  if (!fs.existsSync(file)) continue
  for (const line of readFrames(file).split('\n')) {
    if (line.trim() === '') continue
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (record?.type !== 'user/message') continue
    const message = record.data ?? {}
    const body = (Array.isArray(message.content) ? message.content : [])
      .filter(block => block?.type === 'text' && typeof block.text === 'string')
      .map(block => block.text).join('\n').trim()
    if (body === '') continue
    const first = body.split('\n').map(l => l.trim()).find(l => l !== '') ?? ''
    const shape = first.slice(0, 28)
    const kind = message.source?.kind ?? '(none)'
    const key = kind + ' · ' + shape
    byShape.set(key, (byShape.get(key) ?? 0) + 1)
  }
}

for (const [key, count] of [...byShape.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24)) {
  console.log(String(count).padStart(4), key)
}
