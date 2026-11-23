import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b200 · /g, 'b201 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.1'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.0`', '最新 `0.2.1`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.1`：按反馈修——删掉鸿蒙光晕；折射位移 58→14px、带宽 26→40px（范围更大更平缓，消掉"内容错位/重影"）；顶部栏改为悬浮在画布之上（`.canvas` 用实测 `--tm-header-h` 补偿），并把 `.panel` 改成透明，玻璃后面终于能看到地图；卡片只保留半透明瓦片。probe 148/148；200/800 张卡拖拽中位 17ms、p95 33ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
