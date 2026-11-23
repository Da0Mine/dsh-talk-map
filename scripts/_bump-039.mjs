import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b308 · /g, 'b309 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.9'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.8`', '最新 `0.3.9`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.9`：逐行核对按钮与面板外观：面板 `background`(被 JS 覆写为透明) / `border-right 1px var(--dsw-alias-border-secondary)` / `box-shadow 6px 0 26px rgba(0,0,0,.32)` / `backdrop-filter url(#…)` / `border-radius 20`；按钮此前改成白 6% 底 + 硬编码边框 + 只剩 inset 高光（**丢外投影**）。已补齐：底透明、边框同 token、`6px 0 26px` 外投影、半径 11（20 会让位移贴图 `straightW<0` 直接不生成）。另发现关键事实：**SVG 折射在本页对面板与按钮都是 0 像素差异**（滤镜开/关整块对比 max=0），`feImage` 本身正常（测试把绿底换成红成功）——即该折射在当前 Chromium 的 `backdrop-filter` 通路里不生效，此前的观感差异全部来自 CSS 的底/边/阴影。另给 `scale` 加了"短边 25%"上限。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
