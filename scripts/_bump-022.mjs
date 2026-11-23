import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b201 · /g, 'b202 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.2'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.1`', '最新 `0.2.2`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.2`：顶栏跳位根因是 `.panel` 没有 `position`，绝对定位的 header 以 shell 为参照跑到宿主顶栏上；加 `.panel { position: relative }` 后 `offsetParent` 实测回到 `tm_panel`，黑边与重叠消失。侧栏把手（`.statusRailTab`）也挂上折射。probe 148/148；面板+顶栏+把手三处滤镜拖拽仍 17ms / p95 19ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
