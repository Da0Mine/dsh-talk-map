import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b822 · /g, 'b823 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.23'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.22`', '最新 `0.8.23`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.23`：修「外侧栏里跑完的会话直接消失，要开一次地图才回来」。根因：外侧栏的最近任务从**看板卡片**里取，而卡片是由**地图面板的 auto-sync 创建**的——地图没开过时，刚跑完的会话根本没有卡片 → 既不在队列（无灯）也不在最近任务（无卡）。改法：外侧栏的 `computeRecentTasks` 输入里补**合成条目**（`cardId = sessionId`），来源是 `finishHistory` 中不在板上的会话；点击仍走 `openSessionInUi(sessionId)`，不依赖卡片。地图侧不变（那里的行要能定位卡片）。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
