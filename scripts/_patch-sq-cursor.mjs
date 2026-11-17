import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')
// 侧栏卡片不是拖拽用的：覆盖 grab 光标与固定宽度
fs.writeFileSync(file, t, 'utf8')
const css = 'src/client/talk-map.module.css'
let sheet = fs.readFileSync(css, 'utf8')
sheet = sheet.replace(
  `.sidebarQueueCard {
  width: auto;
  max-width: none;
  flex: none;
}`,
  `.sidebarQueueCard {
  width: auto;
  max-width: none;
  flex: none;
  /* These cards are navigated, never dragged — the rail's grab cursor does not apply. */
  cursor: pointer;
}

.sidebarQueueCard:active {
  cursor: pointer;
}`,
)
fs.writeFileSync(css, sheet, 'utf8')
console.log('cursor fixed')
