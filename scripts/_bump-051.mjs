import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b500 · /g, 'b501 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.1'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.0`', '最新 `0.5.1`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.1`：① 修「向右拖宽拖出错位残影」——面板/把手上的 `backdrop-filter: url(#…)` 会在改宽时留下旧快照（该滤镜实测本就 0 像素效果），全部移除，面板材质改为纯 CSS；② 拖宽不再拉伸卡片：`--rail-card-w` 固定为 `props.cardWidth`，`.statusRailList` 改 `flex-direction: row; flex-wrap: wrap`，`.statusRailSlot` 定宽 `var(--rail-card-outer)`，宽度够就并排（实测 620px → 2 列、卡宽仍 250）；`RAIL_MAX_W` 560→640（两列需 ≥566）；③ 侧栏卡片改液态玻璃：半透底 `color-mix(bg-layer-1 62%)` + 顶部高光渐变 + 1px 亮边，**不加 box-shadow**（否则会盖掉 `.cardLamp*` 光晕）。卡片上也没加 `backdrop-filter`（每卡一层快照会拖慢：17 → 23ms，故只保留 CSS 材质）。probe 150/150；拖拽 17ms/p95 34ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
