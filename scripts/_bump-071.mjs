import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b700 · /g, 'b701 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.1'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.0`', '最新 `0.7.1`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-26 `0.7.1`：修「完成的对话没有待查看样式、直接掉进最近的任务」。根因：`sessionActivity.observe` 只由 `MapCanvas` 调用，**地图关着时没人观察状态变化**，此时完成的会话只能靠宿主 `completionUnread`，宿主不给就没有灯 → 落进最近的任务。改法：`SidebarQueue`（常驻侧栏）里加一个观察 effect，`observe(statusById, sessions.byId, { onlyBackground: true })`；新增 `onlyBackground` 选项跳过"当前主视图会话"避免给自己讨厌的灯。验证：地图关闭时对 s1 跑完 → `lamp-state.finished={s3,s1}`，打开地图 chip=`done`、不在 recent。probe 的旧断言「关着地图时跑完→不亮」按新规则改为「打开后仍是待查看」，150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
