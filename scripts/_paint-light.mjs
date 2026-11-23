import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t += `
/* ==== liquid glass paint ==== */
/* --dsw-alias-bg-elevated does not exist in the host theme, so the original fallback
   rgba(18,20,26,.94) was used; every "brighter" mix of it still resolved to that dark colour.
   Instead of chasing the token, the panel is now translucent AND lifted with white, so it stays
   see-through (refraction works) without reading as a black slab. */
.statusRailPanel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0.12)),
    rgba(18, 20, 26, 0.5);
  border-right: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0 20px 20px 0;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    10px 0 34px rgba(0, 0, 0, 0.3);
}

/* Cards: lift the same way, one step brighter than the panel so they still read as tiles. */
.statusRailPanel .card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05)),
    rgba(30, 32, 38, 0.62);
  border-color: rgba(255, 255, 255, 0.16);
}
`
fs.writeFileSync(f, t, 'utf8')
console.log('面板：白提亮 + 50% 透明；卡片：白提亮 + 62% 透明')
