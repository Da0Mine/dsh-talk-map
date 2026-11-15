import fs from 'node:fs'
const file = 'src/client/i18n.ts'
let text = fs.readFileSync(file, 'utf8')
const en = "  'edge.injected': 'injected',"
if (!text.includes("'edge.context': 'injected · current context'")) {
  text = text.replace(en, en + "\n  'edge.context': 'injected · current context',")
}
fs.writeFileSync(file, text, 'utf8')
console.log('EN key added')
