import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const MARK = '/* ==== liquid glass rail ==== */'
const at = t.indexOf(MARK)
if (at < 0) throw new Error('marker missing')
t = t.slice(0, at).trimEnd() + '\n'
fs.writeFileSync(f, t, 'utf8')
console.log('已删除玻璃块，CSS 回到 0.1.95')
