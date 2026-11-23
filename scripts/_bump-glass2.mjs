import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b96 · 搜地图上的卡片（标题/正文）'", "'b97 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b96 · Search cards on the map'", "'b97 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.97'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.96`', '最新 `0.1.97`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.1.97`：侧栏玻璃按 iOS26 清透风格重做（去流动光带、模糊 22→10px、底色 20% + 白高光层、1.5px 亮边、卡片 30% 透明玻璃瓦片）；A/B 拖拽玻璃开/关均中位 16–17ms、p95 19ms；probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
