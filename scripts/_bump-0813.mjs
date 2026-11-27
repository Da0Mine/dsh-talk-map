import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b812 · /g, 'b813 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.13'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.12`', '最新 `0.8.13`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.13`：外侧栏（对话侧栏队列）与内侧栏统一分页：默认显示 5 条、底部「查看更多」+5、列表滚到底再往下滚一次也 +5；数据窗口同为 30（`recentRows` 的 `slice(0,3)` → `slice(0, MAX_RECENT_TASKS)`）。实现上把 `MAX_RECENT_TASKS` / `RECENT_PAGE_SIZE` 从 StatusRail 导出给 SidebarQueue 复用，列表容器加 `listRef` + `wheel {passive:false}` 监听（仅触底且还有更多时生效），新增 `.sidebarQueueMore` 样式。构建时发现 `RECENT_PAGE_SIZE` 漏了 export（esbuild 直接报 No matching export），已补。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
