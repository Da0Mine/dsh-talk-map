import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b202 · /g, 'b203 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.3'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.2`', '最新 `0.2.3`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.3`：顶栏恢复原样（删掉 header 玻璃/悬浮/透明面板/画布偏移，`.panel` 回到不透明）；侧栏折射带宽 40→26（位移仍 14）。拖拽卡顿根因实测：整块面板挂 `backdrop-filter` 时每帧多 ~16ms，与模糊半径无关；改由 window `pointerdown/up` 驱动冻结（React Flow 的 onMoveStart 在脚本拖拽里不触发，mid-pan `data-frozen` 曾一直是 0），拖动期间不采样、加浓底色 → 中位 50→18ms。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
