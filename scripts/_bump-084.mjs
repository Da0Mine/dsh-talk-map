import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b803 · /g, 'b804 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.4'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.3`', '最新 `0.8.4`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.4`：① 松手抽搐：FLIP 改为**小于 24px 的修正直接吸附**（不播动画）。拖动期让位用的 step 是"被拖行高+间距"，与被让位行的真实落差常有十几像素差异，把这 19px 做成动画就是用户看到的"抽一下"。实测：未拖动行松手后 10 帧位置 `607×10`（完全不动，修前 607→588→607）；② 「最近的任务」改为**完成任务历史**驱动并持久化：`state-persist` 新增 `history`（14 天，`saveLampState` 带上），`session-activity` 在首次标记完成时写入并暴露 `history()`，两侧栏 recent 以它为门槛、按完成时间倒序；重启后仍保留（实测 addInitScript 播种 3 条历史 → 最近区出 2 张，`page.reload()` 后仍为同样 2 张）。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
