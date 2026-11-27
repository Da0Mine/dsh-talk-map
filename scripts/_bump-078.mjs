import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b707 · /g, 'b708 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.8'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.7`', '最新 `0.7.8`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.7.8`：① 菜单点不动/点穿的根因是挂载位置：`.statusRail` 根节点是 `pointer-events: none`（点击落到卡片上 → 内侧栏"查看摘要"变成打开会话），`.sidebarQueue` 是 `overflow: hidden`（菜单被裁 → 外侧栏"没反应"）；改成 `createPortal(..., document.body)` + `position: fixed; zIndex: 9999; pointerEvents: auto`，重命名/摘要弹层一并 portal；② 置顶改成本地集合 `localPins`（`dsh.talk-map.pins.v1`）先落地，宿主 `pinSession` 变为尽力而为（某些构建没暴露），两侧栏排序都并集本地置顶，最近区也按置顶前置；实测点置顶后 `pins=["s5"]`、最近区顺序改变（`reordered:true`）。③ 实测：标为未读后出现 done 灯；查看摘要不再跳转（地图仍开、弹层或错误行出现、无 pageerror）。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
