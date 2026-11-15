import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b70 · 搜地图上的卡片（标题/正文）'", "'b71 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b70 · Search cards on the map'", "'b71 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.71'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log('bumped', pkg.version)
