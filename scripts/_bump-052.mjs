import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b501 · /g, 'b502 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.2'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.1`', '最新 `0.5.2`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.2`：面板又变不透明的根因——0.5.1 移除 SVG 滤镜时，把 JS 写在面板上的 inline `background: color-mix(bg-base 0%, transparent)` 一并删了，元素回落到插件原生 `rgba(18,20,26,.94)`。改为 CSS 显式 `background: transparent`，并移除插件自带的 `backdrop-filter: blur(10px)`（柔化 + 拖宽残影）。卡片底 62%→45%。实测 `panelBg rgba(0,0,0,0)`、`panelFilter none`；透过率把彩色块放面板后取样：面板内 `(231,73,118)` vs 背后 `(233,73,116)` ≈ 99%。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
