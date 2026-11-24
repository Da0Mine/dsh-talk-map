import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b504 · /g, 'b505 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.5'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.4`', '最新 `0.5.5`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.5`：① 面板折射参数调大：`thickness 100→160`、`bezelWidth 40→60`、`ior 2.5→2.6`、`specularOpacity 0.5→0.6`、显式 `scale 96`（此前公式值）；因 `feDisplacementMap` 在本宿主仍不渲染，同步加了**可见**的边光（`inset 0 0 0 1px rgba(255,255,255,.12)` + `inset 0 0 26px/.05` + `inset 0 0 64px/.02`）来体现"更大范围"；② 侧栏卡片改玻璃 + 模糊：`color-mix(bg-layer-1 58%)` + `backdrop-filter: blur(10px) saturate(1.15)`，不加 `box-shadow` 以免盖掉 `.cardLamp*`。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
