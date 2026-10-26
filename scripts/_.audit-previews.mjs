/**
 * Audit every stored session: what would its card body be? Flags anything that
 * still looks like an injected envelope, so the rules can be checked against the
 * whole corpus instead of one example.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { cleanPreviewText, isHumanMessage } from '../src/client/preview-text.ts'

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

const SUSPECT = /MNEMON|checkpoint|model changed|system-reminder|Time sampled|Current runtime|approval policy|^\s*\[[a-z]/i
let total = 0
let samples = 0
let flagged = 0
for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const file = path.join(root, dir.name, 'session.v4.jsonl.zstd')
  if (!fs.existsSync(file)) continue
  const messages = []
  let origin
  for (const line of readFrames(file).split('\n')) {
    if (line.trim() === '') continue
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (record?.type === 'session') { origin = record.origin; continue }
    if (record?.type !== 'user/message') continue
    const message = record.data ?? {}
    if (!isHumanMessage(message.source)) continue
    const body = (Array.isArray(message.content) ? message.content : [])
      .filter(block => block?.type === 'text' && typeof block.text === 'string')
      .map(block => block.text).join('\n').trim()
    if (body !== '') messages.push(body)
  }
  let preview = ''
  for (const body of messages) {
    const cleaned = cleanPreviewText(body)
    if (cleaned !== '') preview = cleaned
  }
  if (origin === 'subagent') continue   // delegated prompts are machine-authored
  total += 1
  if (preview !== '' && samples < 8) { samples += 1; console.log('OK     ', dir.name.slice(0, 12), JSON.stringify(preview.slice(0, 60))) }
  if (preview !== '' && SUSPECT.test(preview)) {
    flagged += 1
    console.log('SUSPECT', dir.name.slice(0, 12), JSON.stringify(preview.slice(0, 90)))
  }
}
console.log(`\nsessions: ${total}, suspect previews: ${flagged}`)
