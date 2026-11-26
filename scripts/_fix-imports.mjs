import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `import { relativeTime, LAMP_CHIP, type CardGlow, type CardLamp } from './SessionCard.tsx'`,
  `import { useReorder } from './reorder.ts'\nimport { relativeTime, LAMP_CHIP, type CardGlow } from './SessionCard.tsx'`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('修好 import')
