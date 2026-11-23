import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
// 更厚的亮边 + 顶部玻璃厚度带 + 内侧暗晕
t = t.replace(
  `  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    inset 0 0 0 2px rgba(0, 0, 0, 0.3),
    inset 0 1.5px 0 rgba(255, 255, 255, 0.5),
    inset 1.5px 0 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1),
    inset 0 0 26px rgba(0, 0, 0, 0.26),
    10px 0 38px rgba(0, 0, 0, 0.34);`,
  `  box-shadow:
    /* bezel: light ring outside, dark separation, bright top/left edges */
    0 0 0 1px rgba(255, 255, 255, 0.26),
    0 0 0 2px rgba(0, 0, 0, 0.5),
    inset 0 2px 0 rgba(255, 255, 255, 0.62),
    inset 2px 0 0 rgba(255, 255, 255, 0.4),
    inset 0 -2px 0 rgba(255, 255, 255, 0.14),
    inset -2px 0 0 rgba(255, 255, 255, 0.1),
    /* thickness: light band under the top edge, shadow pooling at the bottom */
    inset 0 14px 22px -18px rgba(255, 255, 255, 0.5),
    inset 0 -18px 26px -22px rgba(0, 0, 0, 0.5),
    10px 0 38px rgba(0, 0, 0, 0.34);`,
)
// 顶部厚度带更亮一点
t = t.replace(
  `    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 9%),`,
  `    linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 11%),`,
)
// 卡片：加厚亮边
t = t.replace(
  `  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 0 18px rgba(0, 0, 0, 0.18),
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 10px 26px -14px rgba(0, 0, 0, 0.55);`,
  `  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.45),
    inset 0 1.5px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08),
    inset 0 10px 16px -14px rgba(255, 255, 255, 0.35),
    inset 0 0 18px rgba(0, 0, 0, 0.16),
    0 10px 26px -14px rgba(0, 0, 0, 0.55);`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('加厚亮边与厚度带')
