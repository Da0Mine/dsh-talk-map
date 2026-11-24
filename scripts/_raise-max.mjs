import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace('const RAIL_MAX_W = 560', `const RAIL_MAX_W = 640`)
fs.writeFileSync(f, t, 'utf8')
console.log('RAIL_MAX_W 560 -> 640（两列需要 ≥566px）')
