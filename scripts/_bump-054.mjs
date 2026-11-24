import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b503 · /g, 'b504 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.4'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.3`', '最新 `0.5.4`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.4`：按用户要求回退到「加拖动之前」的 `0.4.5` 外观（`git show 360f0c0:` 写回 `talk-map.module.css` 与 `StatusRail.tsx`），**只保留光晕修复**（`.statusRailList` padding `16px 18px 18px`、`--rail-w` 额外 38px）。拖动调宽、宽度记忆、换行多列、卡片玻璃材质全部移除；`railWidth/RAIL_MAX_W/startResize/WIDTH_KEY` 已确认不存在。实测 `panelBg 透明`、`panelFilter url(#…-1)`、`cardBg rgb(35,35,36)`、拖拽 17ms。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
