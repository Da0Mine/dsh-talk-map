import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = '{ radius: 22, bezel: 26, thickness: 90, ior: 2.2, scale: 14, specular: 0.3 }'
const after  = '{ radius: 22, bezel: 44, thickness: 120, ior: 2.5, scale: 30, specular: 0.34 }'
if (!t.includes(before)) throw new Error('panel params anchor missing')
t = t.replace(before, after)
t = t.replace('{ radius: 14, bezel: 14, thickness: 44, ior: 2.2, scale: 8, specular: 0.26 }',
              '{ radius: 14, bezel: 22, thickness: 60, ior: 2.4, scale: 16, specular: 0.3 }')
fs.writeFileSync(f, t, 'utf8')
console.log('折射参数已加大：bezel 26→44, scale 14→30, ior 2.2→2.5')
