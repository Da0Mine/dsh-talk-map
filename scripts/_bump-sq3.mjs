import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b78 · 搜地图上的卡片（标题/正文）'", "'b79 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b78 · Search cards on the map'", "'b79 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.79'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.78`', '最新 `0.1.79`')
p = p.replace('## 已完成\n', `## 已完成

- **侧栏队列与地图侧栏对齐**（\`0.1.79\`）：只显示**带灯**的卡片（与地图 rail 的 \`glowOf\` 同一套判定：alert→error、\`pendingInteraction\`→waiting、\`running\`→running、\`completed\`/activity→done），不再把整板 100+ 张卡塞进去；卡片 \`width:100%\`+\`box-sizing:border-box\` 撑满侧栏（原来继承 rail 的固定宽度，右边被截、左边像留白）；整块上限收到 \`30vh\` 并内部滚动，工作区列表不再被压扁。实测：3 张带灯卡、卡片宽 177/容器 203、两个按钮可见、点击 opened:1。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
