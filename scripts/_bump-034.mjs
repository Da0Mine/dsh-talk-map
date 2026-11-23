import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b303 · /g, 'b304 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.4'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.3`', '最新 `0.3.4`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.4`：① 侧栏把手也挂同一套折射（实测 `tabFilter = url(#...-2)`、`borderRadius 0 11 11 0`、底色 30%）；② 面板底 `bgOpacity` 50→30，实测面板像素 `rgb(20,20,21)` vs 画布 `rgb(20,20,20)`，视觉上与旁边融为一体。probe 148/148；拖拽 17ms/p95 22ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
