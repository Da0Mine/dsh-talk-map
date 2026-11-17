import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b77 · 搜地图上的卡片（标题/正文）'", "'b78 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b77 · Search cards on the map'", "'b78 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.78'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
const prog = 'PROGRESS.md'
let p = fs.readFileSync(prog, 'utf8')
p = p.replace('最新 `0.1.77`', '最新 `0.1.78`')
p = p.replace('## 已完成\n', `## 已完成

- **侧栏队列改用真实卡片**（\`0.1.78\`）：数据全部客户端读（卡片集来自 \`canvas\` store、标题来自 \`getServices().sessions.list\`、正文用 \`/talk-map/last-user\` 批量取前 14 张、草稿优先），渲染直接复用地图 rail 的 \`.card + .statusRailCard\`，所以外观与地图侧栏卡片一致（标题/两行正文/时间/「待发送」胶囊）。footer 改为纵向（队列在上、\`.toggleControls\` 一行在下），队列 \`max-height:42vh\` 内部滚动，**两个原按钮不再被挤出屏幕**。实测：24 张卡、列表 355/2688 可滚动、\`buttonsVisible:true\`、点击 \`opened:1\`。
`)
p = p.replace('重启 DSH 后展开左侧栏（收起地图侧栏才会展开），确认工作区下方出现「队列中的任务」卡片列并可点击跳转。', '重启 DSH 后展开左侧栏（收起地图侧栏才会展开），确认工作区下方是卡片式队列、可滚动、底部「对话地图」与十字准心两个按钮仍在。')
fs.writeFileSync(prog, p, 'utf8')
console.log('bumped', pkg.version)
