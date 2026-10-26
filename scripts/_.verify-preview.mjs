/**
 * Offline check of the preview rules against REAL session logs: the last two
 * user messages of a session are the runtime's own envelope turns, so the card
 * must walk back to the human message.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import { cleanPreviewText, isEnvelopeOnly } from '../src/client/preview-text.ts'

const file = process.argv[2]
const buf = fs.readFileSync(file)
const MAGIC = [0x28, 0xb5, 0x2f, 0xfd]
const offsets = []
for (let i = 0; i + 4 <= buf.length; i += 1) {
  if (MAGIC.every((byte, index) => buf[i + index] === byte)) offsets.push(i)
}
let text = ''
for (let index = 0; index < offsets.length; index += 1) {
  const end = index + 1 < offsets.length ? offsets[index + 1] : buf.length
  try { text += zlib.zstdDecompressSync(buf.subarray(offsets[index], end)).toString('utf8') } catch { /* skip */ }
}

const users = []
for (const line of text.split('\n')) {
  if (line.trim() === '') continue
  let record
  try { record = JSON.parse(line) } catch { continue }
  if (record?.type !== 'user/message') continue
  const message = record.data ?? {}
  if ((message.source?.kind ?? 'user') === 'tool') continue
  const body = (Array.isArray(message.content) ? message.content : [])
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
  if (body !== '') users.push(body)
}

console.log('user messages:', users.length)
let preview = ''
for (const body of users) {
  if (isEnvelopeOnly(body)) {
    console.log('  skip envelope:', JSON.stringify(body.slice(0, 48)))
    continue
  }
  const cleaned = cleanPreviewText(body)
  if (cleaned !== '') preview = cleaned
}
console.log('\nCARD BODY:', JSON.stringify(preview.slice(0, 160)))
