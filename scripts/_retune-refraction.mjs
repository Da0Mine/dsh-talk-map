import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
// 宽折射带会把面板外侧（近黑）拉进来，视觉上像整块变暗；略收带宽与位移
t = t.replace('{ radius: 22, bezel: 44, thickness: 120, ior: 2.5, scale: 30, specular: 0.34 }',
              '{ radius: 22, bezel: 36, thickness: 110, ior: 2.45, scale: 22, specular: 0.34 }')
fs.writeFileSync(f, t, 'utf8')
console.log('折射带 44→36, 位移 30→22（减少把外部暗色拉进来）')
