import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b508 · /g, 'b509 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.9'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.8`', '最新 `0.5.9`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-25 `0.5.9`：修「没有任务时对话界面侧边栏的队列板块消失」。真正卸掉它的是 `SidebarQueue.tsx` 第 236 行 `if (rows.length === 0) return null`（不是地图那边的 `StatusRail`，那个默认是展开的）。改为始终渲染：标题 + 计数（0）+ 一句 `statusRail.empty`（「暂时没有带状态的卡片」），并新增 `.sidebarQueueEmpty` 样式。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
