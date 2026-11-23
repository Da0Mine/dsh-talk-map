import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b401 · /g, 'b402 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.4.2'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.4.1`', '最新 `0.4.2`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.4.2`：按钮按插件代码重做，参数与侧栏完全一致（`installLiquidGlass(element)` 无覆盖）= `thickness 100 / bezelWidth 40（生效 10，受 radius 11 与短边限制）/ ior 2.5 / specularOpacity 0.5 / bgOpacity 0 / blurAmount 0`，`scale = min(maxDisp×0.8, 短边25%) = min(183, 7.5) = 7.5px`；**模糊已取消**（`tabFilter = url(#…-2)`，无 `blur()`），边框与投影保留插件 CSS 原值。实测 `tabBg 透明`、`tabFilter url(#…-2)`。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
