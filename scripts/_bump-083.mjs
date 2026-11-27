import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b802 · /g, 'b803 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.3'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.2`', '最新 `0.8.3`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.3`：① 修回 0.8.2 引入的回归（拖动时瞬移/互抽）：FLIP 的清除帧原来挂在 `useEffect([ids])` 上，而 `ids` 每次渲染都是新数组 → 每渲染都 cleanup，把 rAF 链取消掉，位移残留不消失。改为在 pointerup 里用 rAF 链推进三帧，不再依赖 effect；② 「最近的任务」入列条件改为**任务中 → 待查看 → 看过**：新增 `src/client/read-archive.ts`（`dsh.talk-map.read-finished.v1`，14 天过期），`sessionActivity.acknowledge/forget` 时写入，会话重新运行时 `readArchive.forget` 移出；两侧栏 recent 都要求 `readFinished.has(sessionId)`。实测：播种 3 条已查看后最近区出现 2 张（第 3 张不在板上）；拖动跟随指针 511→531→551→571→591→611 线性无瞬移，松手 611→607 仅 4px 缓动；probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
