import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b805 · /g, 'b806 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.6'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.5`', '最新 `0.8.6`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.6`：让位改为**按真实槽位**计算（`shiftOf` 用按下时捕获的 `slots` 顶部坐标：先算出落位后的新索引，再返回 `slots[新] - slots[旧]`），不再用统一 step。外侧栏卡片高度差大，统一 step 会让残留位移超过 24px 阈值而被当成动画播放，于是松手抽搐；改成槽位差后残留为 0。实测：未拖动行松手后 10 帧位置恒定（`491×10`），修前会出现十几像素来回。probe 150/150（首次出现惯常 flaky 的把手命中项，复跑通过）。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
