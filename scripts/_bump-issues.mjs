import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b89 · 搜地图上的卡片（标题/正文）'", "'b90 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b89 · Search cards on the map'", "'b90 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.90'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.89`', '最新 `0.1.90`')
p = p.replace('## 已完成\n', `## 已完成

- **按 issue 修一轮**（\`0.1.90\`）：合并社区 PR #4（\`session-actions.ts\` 补 \`callRpc\` 导入，删除会话不再抛 ReferenceError）与 PR #5（归档会话不再回到地图：\`placeableSessionIds\` 接收 \`archivedSessionIds\` 并在 \`visibleCards\` 里剔除）；#1 的 digest TDZ 经核对在当前 \`lib/index.js\` 已不复存在（\`const session = args[0]\` 已在使用之前，且无 \`shouldAuto\`），属旧版本问题；#2 新增 \`IMPORT_CAP=120\`（导入工作区/同步文件夹一次最多放 120 张，超出量用 toast 告知），#6 新增 \`PREVIEW_BATCH=40\`（每次轮询最多请求 40 个会话的末条消息，不再一次性打 1000 个 surface）。probe 148/148。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
