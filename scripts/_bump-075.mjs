import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b704 · /g, 'b705 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.5'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.4`', '最新 `0.7.5`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.7.5`：① 两侧栏拖拽升级为"跟手 + 让位"：`useReorder` 记录按下时行高与间距，拖动中按指针算出目标索引，经过的行用 `shiftOf` 平移让位，被拖行加阴影/`z-index` 且去掉过渡，松手提交（参考地图卡片拖动的手感）；② 右键菜单补齐到与地图一致 7 项（置顶/未读/重命名/查看摘要/归档/批量操作…/删除会话（回收站）），批量通过 `map-state.requestBatch` + `claimBatchIntent` 由地图面板消费；③ 外侧栏发光被裁：列表内边距 `0 4px 6px` → `10px 16px 12px`，左右各留 16px。probe 150/150；实测菜单 7 项、拖动顺序改变。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
