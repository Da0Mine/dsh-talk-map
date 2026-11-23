import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t = t.replace('  background: rgba(18, 20, 26, 0.55);',
              '  /* No white: the theme\'s own layer colour at reduced alpha, so it reads lighter than the\n     canvas without any haze. */\n  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 74%, transparent);')
t = t.replace('  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 78%, transparent);',
              '  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 90%, transparent);')
fs.writeFileSync(f, t, 'utf8')
console.log('面板/卡片改用主题 layer-1 半透明（无白色叠加）')
