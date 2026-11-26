import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b701 · /g, 'b702 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.2'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.1`', '最新 `0.7.2`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-26 `0.7.2`：① 新增 `src/client/reorder.ts`（`useReorder`：按槽位中心算落点、松手提交），地图侧栏「最近的任务」与外侧栏队列两段都接上拖动改序；② 内侧栏隐藏滚动条（`scrollbar-width: none` + `::-webkit-scrollbar` 归零，实测 `scrollbarWidth=none`），滚动仍可用；③ `.cardReticle` 提到 `z-index: 3`，避免被流光环盖住；`currentSessionId()` 为空时回退到"主视图保留"的会话；④ 外侧栏「最近的任务」卡片补上正文（预览请求从 `rows` 扩到 `rows + recentRows`，`PREVIEW_LIMIT+3`）；⑤ 核对呼吸灯：`.cardLampDone`→`talkmap-lamp-green 2.8s`、`.cardLampWaiting`→`talkmap-lamp-amber 3.4s`、运行卡为 `.cardLampRunning::after` 的 conic 流光（1.8s），三者都在；运行卡的**脉冲**按既有回归项「运行中不呼吸」保持关闭。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
