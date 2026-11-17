import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b74 · 搜地图上的卡片（标题/正文）'", "'b75 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b74 · Search cards on the map'", "'b75 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.75'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log('bumped', pkg.version)
