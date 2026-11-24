import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')

// 1) 卡片回退为插件原始的不透明样式：删掉我们的覆盖
const cardRule = `
/* Rail cards: the same glass, with a blur so the canvas behind them melts. No box-shadow here —
   it would beat .cardLamp* and swallow the lamp glow. */
.statusRailPanel .card {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 58%, transparent);
  border-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px) saturate(1.15);
  -webkit-backdrop-filter: blur(10px) saturate(1.15);
}
`
if (!t.includes(cardRule)) throw new Error('card override block missing')
t = t.replace(cardRule, '\n')

// 2) 光晕不再被列表裁剪：滚动容器上移到面板自身，列表 overflow 可见
t += `
/* The lamp glow was clipped by the scrolling list (an overflow:auto box clips on both axes), so it
   could never reach the glass edge. Scroll the panel instead and let the list overflow freely —
   the halo is then bounded by the panel itself, i.e. by the rail's own edge. */
.statusRailPanel {
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.statusRailHead {
  padding: 10px 10px 0;
}

.statusRailList {
  overflow: visible;
  padding: 10px;
}
`
fs.writeFileSync(f, t, 'utf8')
console.log('CSS: 卡片回不透明 + 滚动上移到面板、列表不裁剪')
