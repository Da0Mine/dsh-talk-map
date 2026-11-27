import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b821 · /g, 'b822 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.22'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.21`', '最新 `0.8.22`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.22`：**按用户要求回退标题加载方式**——撤掉 `title-cache.ts` 与 `card-cache.ts` 两层本地缓存（文件已移入回收区，batch `20261127T174952746Z-7cdb`），标题恢复为"重命名 → 会话列表标题 → 卡片快照 → 会话加载中…"，`visibleCards` 重新只用宿主 `/talk-map/state` 的卡片。**保留**的其他改动：ghost 判定（列表未就绪不算幽灵卡）、正文启动预热（3 张/批、1.2s、延迟 4s、25s 重读节流）、两侧栏分页（5 条 + 查看更多 + 触底）、最近任务共用计算与按最后看完排序、卡片 `title` 快照字段。probe 150/150；构建 823.0 kB。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
