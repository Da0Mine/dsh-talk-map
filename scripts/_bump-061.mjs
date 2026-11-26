import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b600 · /g, 'b601 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.6.1'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.6.0`', '最新 `0.6.1`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-26 `0.6.1`：未读灯重启丢失的**真正缺口**——我们只持久化「地图开着时观察到的 running→idle 转变」，而用户没看过的会话是**宿主**标的 `completionUnread`，宿主自己不跨重启保存，于是重启后什么都恢复不出来。改为 `observe()` 里把 `completionUnread === true` 也导入 `finished` 并 `persist()`。验证：harness 里对一个空闲会话 `hostUnread` → 卡片 chip=`done` → 刷新（等同重启）→ chip 仍 `done`，`localStorage["dsh.talk-map.lamp-state.v1"]` 内含 `finished:{s3,s6}`。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
