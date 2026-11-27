import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b806 · /g, 'b807 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.7'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.6`', '最新 `0.8.7`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.7`：① 修「两个侧栏都拖不动」：0.8.6 在 `begin()` 里把局部数组命名为 `slots`，遮蔽了同名 ref → `slots.current` 抛 TDZ ReferenceError，pointerdown 直接失败（无 pageerror 冒到外层，只有拖动完全没反应）。改名 `slotTops`；实测最近区拖动 `593→491` 线性跟手且顺序改变；② 修「读完的任务从面板消失」：完成历史原来只在"给灯"的分支里写，而"你正看着的会话"按设计不给灯 → 没有历史 → 既不在待查看也不在最近任务。改为**完成即写历史**（`wasRunning === true && !history.has()`），与是否给灯无关。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
