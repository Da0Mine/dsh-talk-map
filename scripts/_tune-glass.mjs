import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
// 面板更透、更亮，液态高光更强
t = t.replace(
  `      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 58%, transparent) 0%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 34%, transparent) 44%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 52%, transparent) 100%);`,
  `      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 52%, transparent) 0%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 26%, transparent) 44%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 44%, transparent) 100%);`,
)
t = t.replace('backdrop-filter: blur(20px) saturate(180%) brightness(1.06);', 'backdrop-filter: blur(22px) saturate(190%) brightness(1.08);')
t = t.replace('-webkit-backdrop-filter: blur(20px) saturate(180%) brightness(1.06);', '-webkit-backdrop-filter: blur(22px) saturate(190%) brightness(1.08);')
t = t.replace(`  mix-blend-mode: screen;
  opacity: 0.85;
  z-index: 0;`, `  mix-blend-mode: screen;
  opacity: 1;
  z-index: 0;`)
// 卡片再透一点，并加一道顶部高光渐变
t = t.replace(
  `  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 74%, transparent);
  backdrop-filter: blur(6px) saturate(140%);`,
  `  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 42%),
    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 66%, transparent);
  backdrop-filter: blur(8px) saturate(150%);`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('微调完成')
