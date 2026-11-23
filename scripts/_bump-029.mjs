import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b208 · /g, 'b209 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.9'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.8`', '最新 `0.2.9`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.9`：亮度到头——面板 97%（实测像素 `rgb(20,22,28)`，与 `--dsw-alias-bg-elevated` 原值一致）、卡片直接用 `var(--dsw-alias-bg-layer-1)` 不透明。用户截图实测左侧面板 `rgb(21,22,27)` / 右侧画布 `rgb(20,20,20)`（面板本就略亮），且卡片仍能透出，说明他在跑 72% 的旧包（0.2.8 发布于其后）。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
