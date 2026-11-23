import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b307 · /g, 'b308 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.8'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.7`', '最新 `0.3.8`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.8`：按钮折射不可见的根因确定——插件 `scale = maxDisp×0.8` 是**绝对像素**（实测面板 182.95px、按钮同值），按钮仅 30px 宽，位移采样点全落在元素范围外，Chromium 取不到 backdrop → 输出等于原样。对比两条路径：滤镜都正常生成（`-1` feImage 296×744、`-2` feImage 30×77，均 data URL 有效），差别只在元素尺寸/safeBezel(19 vs 10)。结论：该算法对小元素不成立。改为按钮直接绘制同款材质（`rgba(255,255,255,.06)` + 1px 亮边，无模糊无滤镜），实测 `tabBg rgba(255,255,255,.06)`、`tabFilter none`。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
