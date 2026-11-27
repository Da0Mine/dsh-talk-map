import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('.cardPinIcon')) {
  t += `
/* Pin marker on queue cards: the rail pin is its own switch, so it needs a visible state. */
.cardPinIcon {
  margin-left: 6px;
  font-size: 10px;
  line-height: 1;
  opacity: 0.75;
  flex: none;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: cardPinIcon')
}
