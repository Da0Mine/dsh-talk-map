import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t = t.replace('backdrop-filter: blur(6px) saturate(1.7) !important;\n  -webkit-backdrop-filter: blur(6px) saturate(1.7) !important;',
  'backdrop-filter: blur(2px) saturate(1.5) !important;\n  -webkit-backdrop-filter: blur(2px) saturate(1.5) !important;')
fs.writeFileSync(f, t, 'utf8')
console.log('frozen 模糊 6px -> 2px')
