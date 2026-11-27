import fs from 'node:fs'
const f = 'scripts/_twitch-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace('CDP = 10190', 'CDP = 10197')
fs.writeFileSync(f, t, 'utf8')
console.log('换端口重跑')
