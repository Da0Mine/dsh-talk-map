import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b80 · 搜地图上的卡片（标题/正文）'", "'b81 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b80 · Search cards on the map'", "'b81 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.81'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.80`', '最新 `0.1.81`')
p = p.replace('## 已完成\n', `## 已完成

- **侧栏只留地图开关 + 队列可拖动调高**（\`0.1.81\`）：十字准心「回到当前对话」从侧栏 footer 移到地图面板头部（\`MapOverlay\` 的 header，\`data-talkmap-back\` 随之搬走），footer 只剩一个「对话地图」；队列顶部加了 hover 才显形的手柄（\`.queueGrip\`，opacity 0→1，\`cursor:ns-resize\`），拖动改高度并写 \`localStorage['dsh.talk-map.queueHeight']\`，范围 76px～70vh，双击还原自适应。实测：手柄藏/显 0→1、拖 120px 高度 312→438 且落盘 432、地图按钮仍可见、面板头部十字准心 title=回到当前对话。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
