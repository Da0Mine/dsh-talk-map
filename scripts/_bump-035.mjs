import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b304 · /g, 'b305 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.5'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.4`', '最新 `0.3.5`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.5`：消除"两块玻璃叠加"——把手玻璃改为**仅关闭态**挂载（`useEffect` 依赖 `open`），展开态再用 CSS 去掉它的底色/边框/滤镜，只留图标；面板左缘保持 0 圆角、无边框，与左侧连成整体。参数核对：`thickness 100 / bezelWidth 40（实际生效 19，受 radius 20 限制）/ ior 2.5 / specularOpacity 0.5 / bgOpacity 30 / blur 0`，`scale = maxDisp×0.8 = 183px`（插件原公式；窄面板下边缘位移很大，属该算法特性）。probe 148/148；拖拽 17ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
