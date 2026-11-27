import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b709 · /g, 'b800 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.0'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.9`', '最新 `0.8.0`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.0`：① **侧栏置顶与地图置顶彻底分开**：原来点侧栏置顶会顺带调宿主 `setPinned`，把地图里的卡片也置顶了；现在侧栏置顶只写 `localPins`（不发宿主请求），语义＝"在侧栏队列里置顶"；② 置顶卡有明显标记（`📌` `cardPinIcon`）并**浮到整列最前**（原来只能在所属区段内移动：无灯卡在「最近的任务」区里排前，看不到效果）；置顶的无灯卡会从「最近的任务」区提到主列表顶部，两侧栏都这样；③ 查看摘要改为**先读 `/talk-map/state` 里已存的 digest**，失败再退 `/digest/ensure`——之前直接调 ensure，对不在运行的会话会被拒，外侧栏点的多是旧卡所以报"摘要失败"；④ 菜单动作仍有 toast 反馈（0.7.9）。probe 150/150；harness 实测：置顶后 `pins=["s5"]`，该卡从第 6 位升到第 1 位。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
