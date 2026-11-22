import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b91 · 搜地图上的卡片（标题/正文）'", "'b92 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b91 · Search cards on the map'", "'b92 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.92'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.91`', '最新 `0.1.92`')
p = p.replace('## 已完成\n', `## 已完成

- **新建会话要开地图才出现（侧栏）**（\`0.1.92\`）：侧栏队列原先行源是 \`canvas.cards\`，而新会话的卡片由 MapCanvas 挂载时的 effect 才补建 → 不开地图就看不到。改为按**会话列表**建行（\`sessions.ids\`，过滤 blank / subagent / 归档），带灯即出现；卡片只用来给地图定位。归档集合来自 \`ctx.workspaces\`（运行时是 \`ClientWorkspaceModel\`，有 \`getSnapshot/subscribe\`，\`archivedSessionIds\` 在其中）。踩坑：给这个订阅写的空快照 \`() => ({})\` 每次返回新对象，直接触发 React #185 无限重渲染，必须用模块级常量。实测：\`addSession(running:true)\` 后侧栏立刻出现该会话（\`lamp=running\`），此时 \`hasCard=false\`、板上仍是 24 张卡、\`selectedPanel=null\`（全程没开地图）；probe 148/148；两侧栏顺序仍一致。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
