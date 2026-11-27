import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b814 · /g, 'b815 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.15'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.14`', '最新 `0.8.15`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.15`：① 两侧「最近的任务」**合用一个计算函数** `src/client/recent-tasks.ts`（`computeRecentTasks`）：来源统一为"看板卡片 ∩ 完成历史 − 队列中已列 − 未完成"，按最后看完时间倒序、上限 30。此前内侧取看板卡、外侧取会话列表，来源不同必然不一致；② 外侧卡片没有正文：预览请求原来是 `[...rows, ...recentRows].slice(0, 17)`，把最近卡整段截掉；改为**分开预算**（队列行 14 张 + 最近 10 张），并把去重键从 `Set<sessionId>` 换成 `Map<sessionId, stamp>`，会话更新后会重新拉。probe 150/150；分页回归（预置多条 → 初始 5 张 + 查看更多 → 点击 +5）通过。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
