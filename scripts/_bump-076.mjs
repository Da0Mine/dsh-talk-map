import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b705 · /g, 'b706 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.6'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.5`', '最新 `0.7.6`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.7.6`：① 修「让位抽搐」：`useReorder` 在按下时一次性冻结各行中心（`centres`），移动中只跟冻结值比较 → 目标索引稳定，不再出现"测量→位移→再测量"的反馈环（SortableJS 同思路）；② 修「查看摘要」点了没反应：摘要弹窗由 `RailCardMenu` 自己渲染，原来 `.then` 里调了 `props.onClose()`，父组件卸载把弹窗一起带走；改为保持挂载；③ 修「置顶没效果」：`queue-order` 的 `queueRank(lamp, draft, pinned)` 让置顶返回 -1（排最前），两侧栏 rows 都带 `pinned`；`SidebarQueue` 里 `pinnedSessions` 声明提到 `rows` 之前（曾因 TDZ 白屏，probe 抓到 `Cannot access before initialization`）。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
