import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const at = t.indexOf('/* ==== liquid glass paint ==== */')
if (at < 0) throw new Error('paint block missing')
t = t.slice(0, at)
t += `/* ==== liquid glass paint ==== */
/* No white layers anywhere: echo-liquid-glass only refracts and adds a specular rim inside the
   SVG filter. The fill is the plugin's own dark colour at reduced alpha, nothing else. */
.statusRailPanel {
  background: rgba(18, 20, 26, 0.55);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0 20px 20px 0;
  box-shadow: 10px 0 34px rgba(0, 0, 0, 0.3);
}

.statusRailPanel .card {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 78%, transparent);
  border-color: rgba(255, 255, 255, 0.12);
}
`
fs.writeFileSync(f, t, 'utf8')
console.log('白色雾层已删除；面板 55% 透明、卡片 78% 透明，均无白色叠加')
