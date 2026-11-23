import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const before = `  border-color: color-mix(in oklab, var(--dsw-alias-border-l2, #ffffff) 55%, transparent);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12);`
const after = `  border-color: color-mix(in oklab, var(--dsw-alias-border-l2, #ffffff) 50%, transparent);
  border-radius: 12px;
  /* Fresnel rim: bright top edge, faint ring all round, so each card reads as a glass tile. */
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);`
if (!t.includes(before)) throw new Error('card border block not found')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('卡片加了菲涅尔边')
