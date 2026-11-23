import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b302 · /g, 'b303 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.3'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.2`', '最新 `0.3.3`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.3`：按用户要求删掉模糊——`blurAmount` 默认 2→0（该值源自 echo 插件 `liquidGlassParams.blurAmount: 2`），`backdrop-filter` 现在只有 `url(#id)`，纯折射无模糊。实测 `panelFilter = url("...-1")`、面板底 `color(srgb .0823/.0823/.0902 / .5)`、卡片仍是原始 `rgb(35,35,36)`。probe 148/148；拖拽 17ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
