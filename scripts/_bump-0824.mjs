import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b823 · /g, 'b824 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.24'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.23`', '最新 `0.8.24`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.24`：修「外侧栏冒出一堆莫名其妙的会话（Mnemon · Idle review / review this finished conversation…）」。截图里那些是 **dsh-mnemon 派生的 subagent 会话**，被我 0.8.23 的合成条目从 `finishHistory` 里直接捞了出来——`rows` 本来有 `summary.origin === "subagent"` 过滤，合成条目这条新路径没有。改法：合成条目要求 `sessions.byId[id]` 存在且 `origin !== "subagent"`、`blank !== true`、未归档；依赖补 `archivedSessionIds`。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
