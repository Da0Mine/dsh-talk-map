import fs from 'node:fs'
const file = 'src/client/talk-map.module.css'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex((l, i) => l.trim() === '.toggleRow {')
if (at < 0) { console.log('.toggleRow not found'); process.exit(1) }
const padAt = lines.findIndex((l, i) => i > at && i < at + 10 && l.includes('padding: 6px 10px;'))
if (padAt < 0) { console.log('padding line not found'); process.exit(1) }
lines[padAt] = [
  '  /* Taller hit area: a 30px strip was easy to miss-click. */',
  '  min-height: 40px;',
  '  box-sizing: border-box;',
  '  padding: 9px 12px;',
].join('\n')
const fontAt = lines.findIndex((l, i) => i > padAt && i < padAt + 8 && l.includes('font-size: calc(13px'))
if (fontAt >= 0) lines[fontAt] = lines[fontAt].replace('calc(13px', 'calc(14px')
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('toggleRow: min-height 40px, padding 9/12, font base 14px')
