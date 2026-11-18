import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b86 · 搜地图上的卡片（标题/正文）'", "'b87 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b86 · Search cards on the map'", "'b87 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.87'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.86`', '最新 `0.1.87`')
p = p.replace('## 已完成\n', `## 已完成

- **两侧栏都显示「待发送」卡片，优先级最低**（\`0.1.87\`）：\`StatusRailEntry.lamp\` 改为可选并加 \`draft\` 标记；地图 \`statusEntries\` 在 \`glowOf\` 为空时若该会话有草稿就补一条（\`draft:true\`、正文=草稿）；侧栏 \`rows\` 同理。排序：带灯的手动顺序不变，待发送一律 append 到最后（按更新时间倒序）。无灯时卡片不加灯阴影、胶囊换成黄色「待发送」。踩坑：侧栏原来有 \`...(drafts[id] ? { draft: drafts[id] } : {})\` 把布尔 \`draft\` 覆盖成字符串，导致排序失效（已删）；StatusRail 的 \`ordered\` 用字符串锚点替换没匹配上（静默无效），改按行号替换才生效。实测两侧栏顺序均为 正在运行 → 等你回复 → 待查看×2 → 待发送×3。
- **已知遗留（非本版引入）**：probe「拉伸撞到相邻文件夹就停住」稳定差 2px（右边缘 902 vs 邻居 900），stash 掉本版改动后照样复现，说明是更早版本的问题，待单独修。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
