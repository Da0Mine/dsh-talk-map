import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b81 · 搜地图上的卡片（标题/正文）'", "'b82 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b81 · Search cards on the map'", "'b82 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.82'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.81`', '最新 `0.1.82`')
p = p.replace('## 已完成\n', `## 已完成

- **远程控制按钮移出侧栏**（\`0.1.82\`）：之前误以为是本插件的十字准心，已回退（十字准心回到侧栏 footer）。真正的目标是 \`ds-harness-remote@0.6.5\` —— 它只注册 \`shell.overlay\` + \`sidebar.footer.action\`（id \`ds-harness-remote-workspace\`，class \`.dshRemoteSidebarEntry\`，无快捷键/无设置入口）。做法：本插件注入一条全局样式 \`.dshRemoteSidebarEntry{display:none!important}\`（style id \`dsh-talk-map-hide-remote-entry\`）把它从侧栏藏起来，同时注册 \`settings.section\`（id \`talk-map-remote\`，标题「远程控制」）承载一个按钮，点击那个被隐藏的节点来打开它的面板。不改第三方包，删掉 \`src/client/RemoteEntry.tsx\` 的两处注册即还原。实测：样式注入成功、节点 \`display:none\`、隐藏节点仍可 \`.click()\`、侧栏按钮恢复为「对话地图 + 回到当前对话」。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
