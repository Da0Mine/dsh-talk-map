import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b87 · 搜地图上的卡片（标题/正文）'", "'b88 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b87 · Search cards on the map'", "'b88 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.88'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.87`', '最新 `0.1.88`')
p = p.replace('## 已完成\n', `## 已完成

- **文件夹拉伸压邻居 2px**（\`0.1.88\`）：\`.wsFrame\` 是 \`content-box\`，几何却按外框算，1px 边框被额外加上 → 视觉右边缘比几何多 2px。加 \`box-sizing: border-box\` 后镜像页实测 overlap 2 → 0（daily right 945 / medkit x 945）。
- **\`/talk-map/client-boot\` 每秒 404**（\`0.1.88\`）：客户端 \`rpc.ts\`（搜索/跳转失败上报）与 \`jump-highlight.ts\`（跳转诊断）一直在打这个路由，宿主从未实现。选择"保留诊断、补宿主空路由"：\`POST /talk-map/client-boot\` 只读请求体并回 \`{ok:true}\`，不落盘。
- **探针安全闸**（同批）：\`test/probe.mjs\` 加四道闸——CDP 端口被占用即拒跑、要求 \`/json/version\` 的 Browser 以 \`Edg/\` 开头、改用 \`context.newPage()\` 而非 \`pages()[0]\`、目标页是 DSH（38373 / \`__DSH_BOOT__\`）则抛错。**原因：2026-11-18 该探针把 8791 的测试页导航进了 DSH 桌面窗口，随后停服务导致 \`Desktop page failed to load … ERR_CONNECTION_REFUSED\`，整个 app 退出。**
`)
p = p.replace('## 坑与未决\n', `## 坑与未决

- **别在固定 CDP 端口上"等到有响应就开始操作"**：那可能是别人的浏览器/宿主窗口。必须校验身份并开新页；停本地静态服务前先确认没有界面正在加载它（否则 ERR_CONNECTION_REFUSED 会把整个 Desktop 带下去）。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
