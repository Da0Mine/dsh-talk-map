import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b79 · 搜地图上的卡片（标题/正文）'", "'b80 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b79 · Search cards on the map'", "'b80 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.80'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.79`', '最新 `0.1.80`')
p = p.replace('## 已完成\n', `## 已完成

- **侧栏队列布局改用内联样式**（\`0.1.80\`）：查出宿主真实容器 —— \`footArea{flex-direction:column; flex:none; align-items:center}\` 里放 \`footerActions{display:flex}\`（**行**）。之前按钮和队列并排、按钮被垂直居中，就是因为依赖 CSS 类且受行布局影响。现在外层/控制行/队列块/卡片宽度全部走内联样式（\`flex-direction:column\`、\`width:100%\`、\`flex:1 1 100%\`、\`maxHeight:46vh\`、列表 \`overflowY:auto\`），不再受安装副本里 CSS 是否生效影响。实测（镜像宿主容器、390px 侧栏）：卡片 x=12 w=365 撑满、按钮 y=862 在底部、\`buttonsVisible:true\`、点击 opened:1。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
