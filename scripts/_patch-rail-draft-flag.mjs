import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex((l, i) => i > 955 && i < 975 && l.trim() === 'lamp,')
if (at < 0) throw new Error('lamp entry line not found')
const indent = lines[at].match(/^\s*/)[0]
lines.splice(at + 1, 0,
  indent + '// A lamped card can still hold unsent text: the footer shows both chips.',
  indent + "...((draftTexts[card.sessionId] ?? '').trim() !== '' ? { draft: true } : {}),",
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('rail entry draft flag added at line', at + 2)
