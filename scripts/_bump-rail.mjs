import fs from 'node:fs'
const file = 'src/client/i18n.ts'
let text = fs.readFileSync(file, 'utf8')
text = text.replace("'b56 · 搜地图上的卡片（标题/正文）'", "'b57 · 搜地图上的卡片（标题/正文）'")
text = text.replace("'b56 · Search cards on the map'", "'b57 · Search cards on the map'")
fs.writeFileSync(file, text, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.57'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log('bumped to', pkg.version)
