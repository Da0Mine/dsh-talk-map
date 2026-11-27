import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b801 · /g, 'b802 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.2'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.1`', '最新 `0.8.2`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.2`：修「换位松手时上面的卡片往上抽搐」。原因是松手那一帧同时发生两件事：拖动期的让位 `translateY` 被撤掉 + DOM 顺序已换成新顺序，于是那一行先跳到旧位移再跳回新位置。改法：`useReorder` 加三帧 FLIP——① 提交前用 `offsetTop`（不含 transform）记录各行布局位置；② 提交后第一帧无过渡地把行放回旧位置；③ 第二帧打开 `transform 150ms` 过渡（仍在旧位）；④ 第三帧清掉位移，让它平滑归位。被拖那张从松手时的视觉位置归位。实测：目标行松手后位置序列 `607 → 607 → 594 → 567 → 540 → 508 → …491`（连续插值，无跳变）；probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
