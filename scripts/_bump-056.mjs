import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b505 · /g, 'b506 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.6'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.5`', '最新 `0.5.6`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.6`：卡片模糊无效的原因查清——**子元素的 `backdrop-filter` 采样不到画布**（面板/把手自身的 blur 有效，所以之前把手"毛玻璃"看得见；隔离测试里 body 直属 div 也有效）。改为把 blur 挂到面板上：`.statusRailPanel { backdrop-filter: blur(14px) saturate(1.12) }`，卡片保留 58% 半透明玻璃底浮在磨砂列上；卡片自己的 `backdrop-filter` 与临时加的 `.statusRailFrost` 子元素都已移除。证据：面板空白带条纹对比度 blur 开 5.8 / 关 8.5。probe 150/150；拖拽 17ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
