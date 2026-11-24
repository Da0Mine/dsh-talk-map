import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('/* Slide with left, not transform')) {
  t += `
/* Slide with left, not transform. An element with a transform becomes a backdrop root in this
   engine, and every child's backdrop-filter is then clamped to the panel interior — which is why
   the card blur had nothing to blur. */
.statusRailPanel {
  transform: none;
  left: calc(-1 * var(--rail-w));
  transition: left 320ms cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 320ms ease;
}

.statusRail[data-open="1"] .statusRailPanel {
  transform: none;
  left: 0;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 面板改用 left 滑动（去掉 transform）')
}
