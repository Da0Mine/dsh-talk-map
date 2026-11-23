import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b309 · /g, 'b400 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.4.0'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.9`', '最新 `0.4.0`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.4.0`：按钮恢复"之前那份玻璃"的三要素——`bgOpacity 45`（填充）、`blurAmount 12`（柔化）、显式 `scale 8`（位移可控），边框/投影用插件原值；`liquid-glass.ts` 新增 `scale` 显式覆盖选项（默认仍走 `maxDisp×0.8`）。此前 0.3.x "忠实移植"把这三样全去掉（bg 0 / blur 0 / scale 183px），30px 宽元素上等于零效果，所以只剩透明。实测 `tabFilter url(#…-2) blur(12px)`、`tabBg .45`。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
