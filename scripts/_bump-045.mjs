import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b404 · /g, 'b405 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.4.5'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.4.4`', '最新 `0.4.5`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.4.5`：修「没有任务时侧栏板块消失」——根因是侧栏展开状态默认关闭（`readOpen()` 只在 localStorage 为 `"1"` 时展开），新工作区首次打开只剩一个把手；而空队列时把手不显示计数徽标、叠加 0.4.x 的透明玻璃，看起来就是"板块没了"。改为：`readOpen()` 无记录时默认 **true**（展开），把手补 1px 描边保证任何状态都可见；空列表仍显示 `statusRail.empty`（「暂时没有带状态的卡片」）。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
