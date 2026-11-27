import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
const at = lines.findIndex(line => line.trim() === 'const PREVIEW_LIMIT = 14')
if (at < 0) throw new Error('PREVIEW_LIMIT not found')
lines.splice(at + 1, 0,
  '/** Reads are expensive (one session surface each): ask for a few, then the next pass. */',
  'const PREVIEW_PAGE = 5',
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('补上 PREVIEW_PAGE')
