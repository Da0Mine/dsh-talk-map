import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b82 · 搜地图上的卡片（标题/正文）'", "'b83 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b82 · Search cards on the map'", "'b83 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.83'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.82`', '最新 `0.1.83`')
p = p.replace('- **远程控制按钮移出侧栏**（`0.1.82`）', '- **远程控制按钮移出侧栏**（`0.1.82` → `0.1.83` 把 settings.section 的 label 从函数改成字符串，与已工作的 dsh-meme 一致）')
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
