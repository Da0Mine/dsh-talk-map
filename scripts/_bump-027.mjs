import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b206 · /g, 'b207 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.7'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.6`', '最新 `0.2.7`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.7`：修两处——① 面板底色 44%→72%、卡片 62%→88%，不再压暗；② 卡片光晕只剩上下：`.statusRailPanel .card` 的 `box-shadow` 覆盖了 `.cardLamp*`（特异性 0,2,0 胜 0,1,0），且 `.statusRailList` 的 `overflow-y:auto` 会把横向光晕裁掉。去掉该 `box-shadow` 覆盖 + 列表左右各留 12px（面板宽度 +26px）后，光晕左右恢复。probe 148/148；200 张拖拽 17ms/p95 21ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
