import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b816 · /g, 'b817 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.17'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.16`', '最新 `0.8.17`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.17`：修「标题久久不出来、显示成一串 id」。根因是**预览重读风暴**：去重键用的是会话 `updatedAt`，而运行中的会话这个值一直在变 → 每 4 秒（外侧栏是每次 rows 变化）就重读一次**整条会话表面**，把宿主事件循环占满，`sessions.byId` 迟迟不 hydrate，标题只能回退成 `card.sessionId`（看起来像乱码）。改法：① 两侧都加 **25 秒最短重读间隔**（`PREVIEW_MIN_INTERVAL_MS` / `PREVIEW_REFRESH_MS`，按 sessionId 记"上次读取时间"，不再按 stamp）；② 标题兜底不再用 sessionId，改为 `card.loadingTitle`（「会话加载中…」/「Loading session…」）。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
