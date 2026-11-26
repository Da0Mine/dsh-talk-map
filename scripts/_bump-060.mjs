import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b509 · /g, 'b600 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.6.0'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.9`', '最新 `0.6.0`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-26 `0.6.0`：修「重启后未查看（待查看）标记消失」。持久化本身正常（`localStorage["dsh.talk-map.lamp-state.v1"]`，14 天 TTL，probe 已有「重启后待读还在」检查并通过），真凶是 `session-activity.observe` 里的一条清理规则：`hydrated.has(id) && retainedBy.mainView > 0` → 视为已读并删除。真实重启时 DSH 把上次会话恢复成主视图，于是所有恢复的标记在首轮状态轮询后就被清掉。改为不再因主视图保留而清除；标记只由三条路释放：宿主 `completionUnread` true→false、用户从地图点开（`acknowledge`）、该会话重新运行或等待回答。probe 150/150（首轮 1 条绘制相关 flake，复跑全绿）。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
