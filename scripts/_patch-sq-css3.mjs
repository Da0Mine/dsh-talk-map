import fs from 'node:fs'
const css = 'src/client/talk-map.module.css'
let s = fs.readFileSync(css, 'utf8')

// 1) 卡片撑满侧栏宽度（原来继承了 rail 的固定宽度 → 右边被截、左边像留白）
s = s.replace(
  `.sidebarQueueCard {
  width: auto;
  max-width: none;
  flex: none;
  /* These cards are navigated, never dragged — the rail's grab cursor does not apply. */
  cursor: pointer;
}`,
  `.sidebarQueueCard {
  /* .statusRailCard pins the rail's own card width; in the sidebar the card must fill the
     column instead, or it renders narrow with a gap on the leading edge. */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex: none;
  /* These cards are navigated, never dragged — the rail's grab cursor does not apply. */
  cursor: pointer;
}`,
)

// 2) 整块高度收紧：只有带灯的卡才进来，通常 1-5 张；不要占掉工作区
s = s.replace('  max-height: 42vh;', '  max-height: 30vh;')
fs.writeFileSync(css, s, 'utf8')
console.log('card width 100% + block 30vh')
