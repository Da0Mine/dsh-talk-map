import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t = t.replace('background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 92%, transparent);',
              'background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 97%, transparent);')
t = t.replace('background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 96%, transparent);',
              'background: var(--dsw-alias-bg-layer-1, #1b1e26);')
fs.writeFileSync(f, t, 'utf8')
console.log('面板 97%、卡片 100%（与改造前一致）')
