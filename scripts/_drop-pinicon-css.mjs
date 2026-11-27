import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const start = t.indexOf('/* Pin marker on queue cards:')
if (start >= 0) {
  const end = t.indexOf('}', t.indexOf('.cardPinIcon')) + 1
  t = t.slice(0, start).trimEnd() + '\n'
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 删除已不用的 cardPinIcon')
}
