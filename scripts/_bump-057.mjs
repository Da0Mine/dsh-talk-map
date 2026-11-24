import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b506 · /g, 'b507 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.7'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.6`', '最新 `0.5.7`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.7`：回退到 `0.5.5`（`git show 248cef9:` 写回两个文件）。原因：`0.5.6` 把 `blur(14px)` 放到**面板**上，整列侧栏被模糊、且观感变成不透明，而用户只要改卡片。回退后面板恢复透明（JS inline `color-mix(bg-base 0%)`）+ `url(#…)` 滤镜 + CSS 边光，卡片保持 58% 玻璃底。已知限制（实测）：卡片自身的 `backdrop-filter` 在本宿主不采样画布，故卡片无模糊。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
