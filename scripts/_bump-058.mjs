import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b507 · /g, 'b508 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.8'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.7`', '最新 `0.5.8`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.8`：① 卡片回退为**不透明**（删掉我们的 `.statusRailPanel .card` 覆盖，回到插件 `bg-layer-1` = `rgb(35,35,36)`）；② 光晕能画到玻璃边界：裁剪来自列表 `overflow-y:auto`（双向裁剪），改为**滚动上移到面板**（`.statusRailPanel{overflow-y:auto}`），列表 `overflow: visible`、面板 `padding: 0`、列表 `padding: 10px`、`.statusRailHead` 补 `10px 10px 0`。实测 `cardBg rgb(35,35,36)`、panel 透明、滤镜在。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
