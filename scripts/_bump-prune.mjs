import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b92 · 搜地图上的卡片（标题/正文）'", "'b93 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b92 · Search cards on the map'", "'b93 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.93'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.92`', '最新 `0.1.93`')
p = p.replace('## 已完成\n', `## 已完成

- **digest 清理与保留上限**（\`0.1.93\`）：本机 \`talk_map.json\` 里 digests 1178 条（655 KB），其中只有 122 条对应存在的卡片。新增 \`pruneDigests(store, cap=400)\`：启动时删掉没有卡片的 digest，再把可用的按 \`generatedAt\` 旧→新裁到 400 条，日志打印 \`pruned X orphaned + Y over-cap digests, Z kept\`。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
