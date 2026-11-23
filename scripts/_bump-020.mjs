import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b99 · /g, 'b200 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.0'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.99`', '最新 `0.2.0`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.0`：侧栏卡片加鸿蒙光效（`installGlow`：跟随光标的径向填充 + mask 2px 内描边，plus-lighter）+ 地图顶部条也做成折射玻璃。踩坑：给每张卡单独挂 `feDisplacementMap` 后拖拽中位帧从 17ms 掉到 50ms（8 个滤镜同时重算），改为卡片只用光效、折射只留面板与顶栏 → 回到 17ms / p95 19ms。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
