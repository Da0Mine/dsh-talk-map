import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b90 · 搜地图上的卡片（标题/正文）'", "'b91 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b90 · Search cards on the map'", "'b91 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.91'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.90`', '最新 `0.1.91`')
p = p.replace('## 已完成\n', `## 已完成

- **视口渲染：拖拽卡顿主因**（\`0.1.91\`）：\`@xyflow/react\` 12.12 的 \`onlyRenderVisibleElements\` 一直没开，视口外卡片也在挂载。开启（>120 张时）后离线基准（无头 Edge 1600×1000，真实中键拖拽）：800 张 DOM 9308→1036、p95 36→19ms；1600 张 DOM 18108→1036、p95 26→19ms；中位帧稳 17ms。probe 148/148。基准脚本 \`scripts/_bench-drag.mjs\`（造卡→拖拽→采样帧间隔）。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
