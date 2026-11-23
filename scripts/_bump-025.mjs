import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b204 · /g, 'b205 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.5'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.4`', '最新 `0.2.5`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.5`：按用户要求改成全程完整渲染——冻结机制（`rail-frozen.ts` + 指针监听 + `data-frozen` CSS）整体删除，拖动与静止同一套折射。实测反而更快：200 张卡中位 17ms/p95 35ms、800 张 17/23（此前「拖动关采样」那条路因为滤镜开关本身引发重绘，A/B 里反而是 33ms）。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
