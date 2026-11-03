import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')
text = text.replace('<svg viewBox="0 0 12 14" width="12" height="14" aria-hidden="true">', '<svg viewBox="0 0 12 14" width="15" height="18" aria-hidden="true">')
fs.writeFileSync(file, text, 'utf8')
console.log('icon enlarged')
