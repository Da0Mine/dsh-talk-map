import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b300 · /g, 'b301 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.1'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.0`', '最新 `0.3.1`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.1`：删掉自己加的白色雾层（`rgba(255,255,255,.14/.08/.12)` 渐变与白色描边环）——echo-liquid-glass 本身不含任何白色填充，只有折射 + 滤镜内的高光。改为纯主题色半透明：面板 `color-mix(bg-layer-1 74%)`、卡片 90%；实测 面板 `rgb(31,31,32)`、卡片 `rgb(35,35,35)`、画布 `rgb(20,20,20)`，无白色叠加。probe 148/148；拖拽 17ms/p95 19ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
