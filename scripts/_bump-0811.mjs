import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b810 · /g, 'b811 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.11'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.10`', '最新 `0.8.11`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.11`：修「外侧栏里刚开跑的任务掉到待发送卡片后面」。0.8.5 为了支持跨优先级拖动，把外侧栏排序改成"用户顺序优先"，于是卡片优先级变化（待发送→运行中）时仍占着旧位置，直到重排。改为**与她栏一致**的规则：`sortQueueRows` 优先级优先（error > waiting > done > running > draft）、桶内按 `manualIndex`。让位动画不受影响（拖动时的目标索引仍自由），只是跨优先级的落位会回到新优先级的位置。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
