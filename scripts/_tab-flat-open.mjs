import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('data-open="1"] .statusRailTab')) {
  t += `
/* Open: the handle must not read as a second rounded layer sitting on the panel edge.
   It becomes the plain icon on the same piece of glass. */
.statusRail[data-open="1"] .statusRailTab {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 展开态把手去底/去边/去滤镜')
}
