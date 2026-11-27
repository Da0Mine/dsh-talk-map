import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b818 · /g, 'b819 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.19'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.18`', '最新 `0.8.19`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.19`：**标题也用本地缓存**（与正文同思路）。新增 `src/client/title-cache.ts`（`dsh.talk-map.titles.v1`，300 条上限、30 天过期、250ms 防抖写盘）：组件初始 state 直接 `readTitles()` → 首帧就能画出上次的标题；会话列表到了再 `putTitle` 回写并覆盖显示。渲染兜底链：重命名 → 会话标题 → 卡片快照 → **本地缓存** → 「会话加载中…」。两侧栏都接入。实测：加载后 `titles.v1` 已写入，二次重载标题沿用缓存。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
