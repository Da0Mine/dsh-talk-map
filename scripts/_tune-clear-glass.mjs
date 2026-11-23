import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
// 面板：更亮一点、边缘更透，加一圈外发光
t = t.replace(
  "    color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 38%, transparent);",
  "    color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 32%, transparent);",
)
t = t.replace(
  "  backdrop-filter: blur(5px) saturate(200%) brightness(1.06);",
  "  backdrop-filter: blur(7px) saturate(215%) brightness(1.1);",
)
t = t.replace(
  "  -webkit-backdrop-filter: blur(5px) saturate(200%) brightness(1.06);",
  "  -webkit-backdrop-filter: blur(7px) saturate(215%) brightness(1.1);",
)
t = t.replace(
  `  box-shadow:
    8px 0 30px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 1px 0 0 rgba(255, 255, 255, 0.1);`,
  `  box-shadow:
    8px 0 30px rgba(0, 0, 0, 0.28),
    0 0 46px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08),
    inset 1px 0 0 rgba(255, 255, 255, 0.14),
    inset 0 26px 40px -34px rgba(255, 255, 255, 0.22);`,
)
// 卡片：更透 + 更强顶光，模拟透镜感
t = t.replace(
  "    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 52%, transparent);",
  "    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 44%, transparent);",
)
t = t.replace(
  `    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02) 46%),`,
  `    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03) 46%),`,
)
t = t.replace(
  `  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);`,
  `  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 20px 26px -26px rgba(255, 255, 255, 0.18);`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('第二遍调整完成')
