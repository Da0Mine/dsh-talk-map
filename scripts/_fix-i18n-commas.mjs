import fs from 'node:fs'
const file = 'src/client/i18n.ts'
let text = fs.readFileSync(file, 'utf8')
const before = (text.match(/,,/g) ?? []).length
text = text.replace(/,,/g, ',')
fs.writeFileSync(file, text, 'utf8')
console.log('fixed double commas:', before)
