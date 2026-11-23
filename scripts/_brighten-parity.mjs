import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t = t.replace('background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 72%, transparent);',
              'background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 92%, transparent);')
t = t.replace('background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 88%, transparent);',
              'background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 96%, transparent);')
fs.writeFileSync(f, t, 'utf8')
console.log('面板 92%、卡片 96%（接近原不透明度）')
