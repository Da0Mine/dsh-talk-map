import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b804 · /g, 'b805 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.5'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.4`', '最新 `0.8.5`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.5`：修「外侧栏拖动不让位」。根因是我把地图侧栏的**优先级桶限制**也套到了外侧栏（`useReorder({ bucketOf })`）：跨桶时目标索引被拒，其它行根本不位移，看起来就是完全没有让位。改为外侧栏**自由换位**（无桶限制），并把排序改成"用户拖过的顺序优先，新行按优先级排在后面"（`queueOrder` 命中者按它排，其余保持 `sortQueueRows` 的优先级顺序）——否则自由换位会被优先级重排回原样。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
