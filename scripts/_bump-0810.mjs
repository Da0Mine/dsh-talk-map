import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b809 · /g, 'b810 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.10'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.9`', '最新 `0.8.10`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.10`：修「刚看完的任务掉到最近任务最底下」。两个原因：① `recentOrder` 的同步 effect 把**新出现的 id 追加到末尾**（`[...kept, ...added]`），这份手动顺序又优先于 MapCanvas 的按时间排序 → 新读的卡被压到底；改为插到最前（`[...added, ...kept]`），并让 `recentEntriesOrdered` 里尚未入序的条目 `unshift` 到顶部；② 已存在的卡再次被读时不会移动：新增 `readMarks` 订阅，检测到某会话的已读时间变化就把它提到 `recentOrder` 最前。两侧栏同改。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
