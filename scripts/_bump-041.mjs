import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b400 · /g, 'b401 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.4.1'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.4.0`', '最新 `0.4.1`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.4.1`：按钮样式回退到 `0.3.3`（即用户说"现在挺好"那一版）——撤掉按钮的 JS 玻璃，只用插件自带 CSS：`background color-mix(bg-elevated 52%)` + `backdrop-filter blur(16px) saturate(1.5)` + `1px rgba(255,255,255,.16)` 边框 + `3px 0 14px rgba(0,0,0,.35)` 投影 + `radius 0 11 11 0`。面板去掉 `border-right` 与 `box-shadow`，与左侧无分界线（保留 `radius 0 20 20 0` 供折射）。实测 open 态：`tabBg oklab(…/0.52)`、`tabFilter blur(16px) saturate(1.5)`、`panelFilter url(#…-1)`、`panelBg 透明`。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
