import fs from 'node:fs'
const f = 'scripts/_wrap-test.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace("localStorage.setItem('dsh.talk-map.status-rail.width.v1','470')", "localStorage.setItem('dsh.talk-map.status-rail.width.v1','620')")
fs.writeFileSync(f, t, 'utf8')
