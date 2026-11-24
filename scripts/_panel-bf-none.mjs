import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('/* The panel must not own a backdrop-filter')) {
  t += `
/* The panel must not own a backdrop-filter: it turns the panel into a backdrop root, and children
   would then blur only the (empty) panel content instead of the canvas. The plugin ships
   blur(10px) here; drop it so the cards can see through to the map. */
.statusRailPanel {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 面板去掉插件自带 backdrop-filter blur(10px)')
}
