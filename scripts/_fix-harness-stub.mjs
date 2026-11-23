import fs from 'node:fs'
const f = 'test/harness.js'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes("for (const sessionId of body?.sessionIds ?? [])"))
if (at < 0) throw new Error('loop not found')
const indent = lines[at].match(/^\s*/)[0]
if (lines[at + 1].includes('texts[sessionId]')) {
  lines.splice(at, 2,
    indent + 'for (const entry of body?.sessionIds ?? []) {',
    indent + "  const sessionId = typeof entry === 'string' ? entry : entry?.id",
    indent + "  if (typeof sessionId !== 'string') continue",
    indent + "  texts[sessionId] = userMessages[sessionId] ?? '你最后说的那句话'",
    indent + '}',
  )
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('harness stub patched at line', at + 1)
}
