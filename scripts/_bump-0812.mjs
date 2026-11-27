import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b811 · /g, 'b812 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.12'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.11`', '最新 `0.8.12`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.12`：左侧栏「最近的任务」改成分页：默认显示 **5 条**，底部有「查看更多」，点一次 +5；面板滚到最底再往下滚一次也 +5（`wheel` 监听 `{passive:false}`，仅 `deltaY>0` 且已触底且还有更多时才 `preventDefault`）。数据侧：`MapCanvas` 最近区窗口 `slice(0,3)` → `slice(0, MAX_RECENT_TASKS=30)`；`state-persist` 新增 `pruneHistory`，历史**最多保留 30 条**（按时间取最新，仍受 14 天限制）。实测：预置多张已完成记录 → 初始 5 张 + 有「查看更多」，点一次后 +1（板上可入列的会话共 6 张，已到底故按钮消失）。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
