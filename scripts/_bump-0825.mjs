import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b824 · /g, 'b825 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.25'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.24`', '最新 `0.8.25`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.25`：修「侧栏有、地图上没有这张卡」。地图的 auto-sync 只在两种情形建卡：①会话属于某工作区且该工作区**还没有画框**（newcomers）；②工作区**有画框**（按框内网格补位）。`sessionWs.get(id) === undefined`（不属于任何已知工作区）或"有画框但没有可用 rect"的会话被**静默跳过**，于是侧栏列得出、地图上没有。新增第三段兜底：这类会话在现有卡片下方按 4 列排一张"散卡"，`added` 上限与原有逻辑一致，依赖补 `archivedSessionIds`。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
