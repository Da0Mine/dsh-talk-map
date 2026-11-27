import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b807 · /g, 'b808 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.8'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.7`', '最新 `0.8.8`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.8`：修外侧栏松手抽搐。根因：松手那一帧里，让位用的 `transform` 被清成 0，而该行的**布局位置又恰好挪了同样的距离**，此时 `transition` 已经恢复成 150ms，浏览器就把这次"清除"当成动画播了一遍（外侧栏卡片高度不一、位移大，所以看得见；内侧栏位移小/被阈值吞掉，所以不明显）。改法：`pointerup` 里**同步**把 `flipPhase` 置 0（该帧所有行 `transition: none`），下一帧再算 deltas；无 deltas 时下一帧恢复过渡。实测未拖动行松手后 10 帧位置恒定。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
