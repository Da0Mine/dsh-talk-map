import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b800 · /g, 'b801 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.1'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.0`', '最新 `0.8.1`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.1`：置顶图标改为与地图卡片同款——抽出共享组件 `src/client/PinMark.tsx`（Material push_pin SVG + `.cardPin` 金色 drop-shadow + `talkmap-pin-glow` 呼吸），地图 `SessionCard` 与两侧栏都用它，删掉临时的 emoji `📌` 与 `.cardPinIcon` 样式。实测侧栏 pin 计算样式：`color rgb(255,214,106)`、`filter drop-shadow(… 6.06px)`、`animation tm_talkmap-pin-glow`、宽 13px，与地图同源。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
