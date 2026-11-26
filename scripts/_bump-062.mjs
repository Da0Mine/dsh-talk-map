import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b601 · /g, 'b602 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.6.2'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.6.1`', '最新 `0.6.2`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-26 `0.6.2`：内存/算力审计后的优化。证据：最大的会话日志 37.3 MB → 解压 **115.8 MB / 43262 行 / 181 ms**（第二 30.7 → 124.3 MB / 169 ms），宿主 `/talk-map/last-user` 用 `runtime.sessionQuery.readSurface(id)` 每次读整份会话面，最多并发 3（峰值约 350 MB 瞬时）；客户端预览轮询原为**每 1.5s、每次最多 8 个、遍历全部卡片**（`visibleCards` 是未归档全集，不是视口）。改为 `PREVIEW_INTERVAL_MS 4000`、`PREVIEW_BATCH 4`，并用 `useViewport()` + `cardLayoutRef` 做**视口过滤**（视口外卡片不再触发宿主读）。回归：probe 150/150；拖拽 200 张 18ms/p95 25ms、800 张 18ms/p95 32ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
