import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b84 · 搜地图上的卡片（标题/正文）'", "'b85 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b84 · Search cards on the map'", "'b85 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.85'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.84`', '最新 `0.1.85`')
p = p.replace('## 已完成\n', `## 已完成

- **侧栏队列与地图侧栏灯判定改为同源**（\`0.1.85\`）：原来侧栏用会话摘要的 \`completed\` 推「待查看」，而地图 rail 用 \`uiSession.sessionStatus\` 的 \`completionUnread\`——结果侧栏漏掉「待查看」卡片（用户实测 2 张只显示 1 张）。现在 \`SidebarQueue\` 直接订阅 \`getServices().ctx.get('uiSession').sessionStatus\`（正是面板 \`useSessionStatus\` 的底层 store），lampOf 与 glowOf 逐条一致：alert→error、\`pendingInteraction\`→waiting、\`running\`→running、\`completionUnread\`/activity→done。harness 里补了同款 stub。实测两边都是 4 张（正在运行/等你回复/待查看/待查看）一一对应。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
