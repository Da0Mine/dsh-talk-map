import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b815 · /g, 'b816 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.16'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.15`', '最新 `0.8.16`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.16`：修「刷新/重启后卡片几分钟都显示『会话已不存在』」。根因：`/talk-map/last-user` 每张卡都要读**整条会话表面**（重），而我把预热写成 12 张/80ms、外侧栏一次 24 张 —— 宿主事件循环被塞满，**会话列表迟迟没加载完**，于是所有卡片走 `card.ghostTitle`（会话已不存在）。改法：① 预热改为 **3 张/批**、间隔 `max(400ms, 本轮耗时×4)` 自适应（上限 4s），并**等 `sessions.ids` 非空**后才启动；② 外侧栏正文初始值改为 `readPreviewTexts()`（缓存播种，重启即有字），请求每次 **5 张**。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
