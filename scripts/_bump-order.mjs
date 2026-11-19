import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b88 · 搜地图上的卡片（标题/正文）'", "'b89 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b88 · Search cards on the map'", "'b89 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.89'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.88`', '最新 `0.1.89`')
p = p.replace('## 已完成\n', `## 已完成

- **两个侧栏共用一套排序**（\`0.1.89\`）：新增 \`src/client/queue-order.ts\`，优先级「异常终止(error) > 等你回复(waiting) > 待查看(done) > 正在运行(running) > 待发送(draft)」，同一优先级内按 \`updatedAt\` 倒序；地图 rail 与原生侧栏都调 \`sortQueueRows\`，不再各排各的。手动拖拽只在**同一优先级组内**重排（跨不了优先级），所以两边永远同序。实测镜像页两边 chip 序列完全一致：等你回复 → 待查看×2 → 正在运行 → 待发送×2；单测 \`test/queue-order.test.mjs\` 5/5（阶梯、整体分组、组内时间、拖拽不跨组、compare 对称性）。
- **探针端口改为运行时挑选空闲端口**（\`0.1.89\`）：固定 9333 上残留了一个查不到归属的监听（pid 31900 已不可查），闸门正确拒绝连接后把探针改成 \`listen(0)\` 取空闲端口再 spawn Edge。改完 \`node test/probe.mjs\` → **148/148**（含此前失败的「拉伸撞到相邻文件夹」）。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
