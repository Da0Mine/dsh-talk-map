import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  backdrop-filter: blur(2px) saturate(1.5) !important;
  -webkit-backdrop-filter: blur(2px) saturate(1.5) !important;`,
  `  /* Any backdrop sampling on a full-height panel costs ~16 ms/frame while the canvas moves,
     regardless of radius, so the pan state drops the filter entirely and compensates with a
     slightly denser fill. */
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 58%, transparent) !important;`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('frozen: 完全关闭采样 + 加浓底色')
