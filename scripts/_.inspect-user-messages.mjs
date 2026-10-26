import fs from 'node:fs'
import zlib from 'node:zlib'

const file = process.argv[2]
const buf = fs.readFileSync(file)
// The log is a sequence of independent zstd frames; zstdDecompressSync stops at
// the first one, so walk the magic numbers (0x28 B5 2F FD) instead.
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const offsets = []
for (let i = 0; i + 4 <= buf.length; i += 1) {
  if (buf[i] === MAGIC[0] && buf[i + 1] === MAGIC[1] && buf[i + 2] === MAGIC[2] && buf[i + 3] === MAGIC[3]) offsets.push(i)
}
let text = ''
for (let index = 0; index < offsets.length; index += 1) {
  const start = offsets[index]
  const end = index + 1 < offsets.length ? offsets[index + 1] : buf.length
  try {
    text += zlib.zstdDecompressSync(buf.subarray(start, end)).toString('utf8')
  } catch {
    // A false-positive magic hit inside compressed data: skip it.
  }
}
const lines = text.split('\n').filter(line => line.trim() !== '')
console.log('frames:', offsets.length, 'lines:', lines.length)

const users = []
for (const line of lines) {
  let record
  try { record = JSON.parse(line) } catch { continue }
  if (record?.type !== 'user/message') continue
  const message = record.data ?? {}
  if ((message.source?.kind ?? 'user') === 'tool') continue
  const blocks = Array.isArray(message.content) ? message.content : []
  const body = blocks
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
  users.push({ seq: record.seq, text: body })
}
console.log('user messages:', users.length)
for (const entry of users.slice(-3)) {
  console.log('\n=== seq', entry.seq, 'len', entry.text.length)
  console.log('HEAD:', JSON.stringify(entry.text.slice(0, 200)))
  console.log('TAIL:', JSON.stringify(entry.text.slice(-200)))
}
