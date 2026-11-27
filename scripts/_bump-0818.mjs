import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b817 · /g, 'b818 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.18'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.17`', '最新 `0.8.18`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.18`：① **标题不再依赖会话列表推送**：`Card` 新增可选 `title` 快照（`shared/model.ts` + host `cardSchema`），建卡时写入、旧卡用 `canvas.setCardTitle` 一次性回填（`titleBackfilled` 去重），渲染兜底链变成 `重命名 → 会话标题 → 卡片快照 → 会话加载中…`；② 预览读取进一步让路：地图预热改为**会话列表就绪后再等 4 秒、单张、间隔 1.2 秒**，滴灌同样推迟 4 秒才启用；外侧栏首次请求延迟 5 秒（`previewAllowed` state 进 deps，保证到点真的触发）、每次 3 张。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
