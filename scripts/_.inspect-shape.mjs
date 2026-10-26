import fs from 'node:fs'
import zlib from 'node:zlib'

const file = process.argv[2]
const plain = zlib.zstdDecompressSync(fs.readFileSync(file)).toString('utf8')
const lines = plain.split('\n').filter(line => line.trim() !== '')
console.log('lines:', lines.length)
for (const line of lines.slice(0, 3)) {
  const record = JSON.parse(line)
  console.log('\nrecord keys:', Object.keys(record).join(','))
  console.log(JSON.stringify(record).slice(0, 400))
}
// Collect every event-ish object and show its type distribution.
const types = new Map()
for (const line of lines) {
  let record
  try { record = JSON.parse(line) } catch { continue }
  const walk = (node) => {
    if (node === null || typeof node !== 'object') return
    if (Array.isArray(node)) { for (const item of node) walk(item); return }
    if (typeof node.type === 'string') types.set(node.type, (types.get(node.type) ?? 0) + 1)
    for (const value of Object.values(node)) walk(value)
  }
  walk(record)
}
console.log('\ntypes:', [...types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}:${v}`).join(' '))
