import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b305 · /g, 'b306 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.6'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.5`', '最新 `0.3.6`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.6`：`bgOpacity` 30→0（完全透明，只剩折射）。实测把彩色块放面板后面、隐藏卡片后取样：`bgOpacity 0` 时面板内像素与背后原色**完全一致** `(233,73,116)`，即 100% 透过。把手的"毛玻璃"其实来自插件原始 CSS（`.statusRailTab` 注释 "Frosted glass"，`blur(16px) saturate(1.5)` + 52% 底），已连同它自己的折射滤镜一起去掉，现在只是图标。probe 148/148；拖拽 21ms/p95 26ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
