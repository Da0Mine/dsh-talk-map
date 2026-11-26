import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b703 · /g, 'b704 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.4'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.3`', '最新 `0.7.4`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.7.4`：① 外侧栏「最近的任务」拖不动——渲染仍用 `recentRows`（按时间）而拖拽改的是 `recentOrder`，改成 `recentRowsOrdered` 并补 `ref`/`onPointerDown`；② 右键菜单改为复用地图同一套 `.menu` / `.menuItem` / `MenuIcon`（此前用的是自造 `.railMenu` 样式，字重字号都不同），临时样式已删；③ issue #7 已在仓库关闭（`state_reason=completed`），并补一条说明判断逻辑的评论。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
