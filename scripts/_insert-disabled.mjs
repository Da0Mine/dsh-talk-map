/** Insert the disabled-index check after the "two channels failed" check. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-grouped.txt', 'utf8').replace(/\n$/, '').split('\n')

const at = lines.findIndex(line => line.includes('check(''命中项带出处片段''))
if (at < 0) {
  console.error('anchor not found')
  process.exit(1)
}
let end = at
while (end < lines.length && !lines[end].trim().endsWith('String(contentHits.snippet))')) end += 1
const next = [...lines.slice(0, end + 1), ...block, ...lines.slice(end + 1)]
fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log(`inserted after line ${end + 1}`)
