import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const at = t.indexOf('/* ==== liquid glass (refraction) ==== */')
if (at < 0) throw new Error('block missing')
t = t.slice(0, at).trimEnd() + '\n'
fs.writeFileSync(f, t, 'utf8')
console.log('已删除我们对 .statusRailPanel / .card 的颜色覆盖，回到插件原始样式')
