import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `/* Handle: no material of its own — the refraction is the only thing it paints, and while the
   rail is open it is just the icon on the panel's glass. */
.statusRailTab {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}`,
  `/* Handle: no material of its own. The plugin shipped a "Frosted glass" chip here
   (blur(16px) + 52% fill); that frosted look is what reads as a second surface, so it goes. */
.statusRailTab {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('把手：去掉原有 frost（blur 16px + 52% 底）')
