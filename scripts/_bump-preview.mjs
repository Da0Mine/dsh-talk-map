import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b94 · 搜地图上的卡片（标题/正文）'", "'b95 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b94 · Search cards on the map'", "'b95 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.95'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.94`', '最新 `0.1.95`')
const entry = [
  '## 已完成',
  '',
  '- **预览读取的内存峰值**（`0.1.95`）：实测 `/talk-map/last-user` 读单个会话 1 907 ms、宿主 +72 MB；12 个并发 24 127 ms、宿主 862→2 245 MB。旧客户端一次发 40 个 → 峰值可达 GB 级。改法（语义不变）：宿主新增 `src/host/preview.ts`（`runLimited` 全局并发 3 + 400 条按 stamp 的文本缓存），客户端改为发送 `{id, stamp}`、每轮 8 个且按最新优先、页面隐藏时不轮询；草稿扫描先按字符串粗筛再 `JSON.parse`。新增 `test/preview.test.mjs`（并发上限/空列表/LRU 淘汰 3 项全过）。probe 148/148；基准 800/1600 张：挂载卡片 69、DOM 1 036、p95 19–21 ms、堆 12–35 MB。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
