import fs from 'node:fs'
const css = 'src/client/talk-map.module.css'
const lines = fs.readFileSync(css, 'utf8').split('\n')
const at = lines.findIndex((l, i) => i > 2540 && l.includes('max-height: 42vh'))
if (at < 0) { console.log('sidebarQueue max-height not found'); process.exit(1) }
lines[at] = lines[at].replace('42vh', '30vh')
fs.writeFileSync(css, lines.join('\n'), 'utf8')
console.log('sidebarQueue max-height -> 30vh @ line', at + 1)
