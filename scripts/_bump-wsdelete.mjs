import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let text = fs.readFileSync(i18n, 'utf8')
text = text.replace("'b60 · 搜地图上的卡片（标题/正文）'", "'b61 · 搜地图上的卡片（标题/正文）'")
text = text.replace("'b60 · Search cards on the map'", "'b61 · Search cards on the map'")
fs.writeFileSync(i18n, text, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.61'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log('bumped', pkg.version)
