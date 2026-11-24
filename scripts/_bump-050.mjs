import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b405 · /g, 'b500 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.0'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.4.5`', '最新 `0.5.0`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.0`：① 卡片光晕左/上被裁：`.statusRailList` 原 `padding: 2px 0 14px`（`overflow-y:auto` 会双向裁剪），改为 `16px 18px 18px`，并把 `--rail-w` 的额外宽度 26→38px 同步留出空间；② 新增拖拽调宽：展开后横向拖把手（`ew-resize`），宽度钳制 `[默认宽度, 560]`，存 `dsh.talk-map.status-rail.width.v1`，重载保留；卡片宽度跟随 `--rail-w`（`railWidth-84`），拖拽位移 >3px 时吞掉随后的 click，避免误收起。实测 308→428、存储 428、重载仍 428。probe 改为画布类检查先收起侧栏 + 新增 2 条默认展开检查，`150/150`。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
