import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace("specular: 0 })", "specular: 0.42 })")
fs.writeFileSync(f, t, 'utf8')
console.log('specular 恢复 0.42')
