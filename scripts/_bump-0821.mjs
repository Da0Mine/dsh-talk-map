import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b820 · /g, 'b821 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.21'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.20`', '最新 `0.8.21`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.21`：把标题/卡片的缓存兜底补全到最后一条链路：① `MapCanvas` 里 7 处**仍是 `?? sessionId`** 的标题兜底（抽屉、搜索结果、跳转提示、分叉面板）统一改成 `… ?? card.title ?? cachedTitles[id] ?? 会话加载中`；② 外侧栏 `rows` 标题也加 `cachedTitles`；③ 新增 `src/client/card-cache.ts`（`dsh.talk-map.cards.v1`，7 天，只存 id/session/board/坐标/标题），`visibleCards` 以缓存快照打底、宿主数据覆盖 → 即使 `/talk-map/state` 回得慢，侧栏也有卡片可画。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
