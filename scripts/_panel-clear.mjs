import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
// 我们的面板规则里补一条透明底（JS 不再写 inline background）
t = t.replace(
  `.statusRailPanel {
  border-radius: 0 20px 20px 0;
}`,
  `.statusRailPanel {
  /* The JS used to write this inline while the SVG filter was attached; with the filter gone the
     element fell back to the plugin's own rgba(18,20,26,.94), which is opaque. Keep it clear so
     the canvas stays visible behind the rail. */
  background: transparent;
  border-radius: 0 20px 20px 0;
}`,
)
// 卡片稍微再透一点，保证"看得到后面"
t = t.replace(
  `    color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 62%, transparent);`,
  `    color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 45%, transparent);`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('CSS: 面板透明底 + 卡片 45%')
