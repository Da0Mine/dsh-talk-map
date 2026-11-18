import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b83 · 搜地图上的卡片（标题/正文）'", "'b84 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b83 · Search cards on the map'", "'b84 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.84'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.83`', '最新 `0.1.84`')
p = p.replace('## 已完成\n', `## 已完成

- **侧栏底部按钮放大**（\`0.1.84\`）：「对话地图」行 \`min-height:40px\`（原 ~30px）、内边距 9/12、字号基准 13→14px、图标 18→20px；准心按钮 24→32px（图标 15→20px）。实测 \`mapButton h=40\`、\`backButton 32×32\`、\`buttonsVisible:true\`。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
