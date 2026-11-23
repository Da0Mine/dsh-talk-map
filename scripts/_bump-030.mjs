import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b209 · /g, 'b300 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.0'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.9`', '最新 `0.3.0`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.0`：**亮度问题真因**——`--dsw-alias-bg-elevated` 在宿主主题里不存在（实测只有 bg-base / bg-layer-1..3），我前几轮所有 `color-mix(var(--dsw-alias-bg-elevated, #14161c) N%)` 都落到回退色 `#14161c`（近黑），所以"调大不透明度"= 覆盖更多黑色，用户观感就是一轮比一轮暗。改为不依赖该变量：面板 = 白色渐变提亮 + `rgba(18,20,26,.5)`，卡片 = 白渐变 + `rgba(30,32,38,.62)`。实测像素：面板 `rgb(52,53,55)`、卡片 `rgb(62,63,67)`，画布 `rgb(20,20,20)`（改造前约 20,22,28，现在明显更亮且半透明）。拖拽 17–18ms。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
