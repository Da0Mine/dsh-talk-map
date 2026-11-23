import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b301 · /g, 'b302 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.2'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.1`', '最新 `0.3.2`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.2`：**完全照搬 echo-liquid-glass**——`liquid-glass.ts` 重写为逐行对应其实现（Snell 剖面 → 位移贴图 → `feDisplacementMap`；`scale = maxDisp * 0.8`；滤镜属性 `x/y/width/height` 用百分比；specular 贴图带宽 = `safeBezel * 2.5`），参数取源码默认值 `thickness 100 / bezelWidth 40 / ior 2.5 / specularOpacity 0.5 / bgOpacity 50 / blurAmount 2`，背景由 JS 写 `color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent)`。CSS 只剩一条 `border-radius: 0 20px 20px 0`（折射需要非零半径），删掉此前所有自加的白色渐变/边框/阴影/卡片覆盖；把手不再单独挂玻璃。实测：面板 `rgb(21,21,22)`、卡片 `rgb(35,35,36)`（原始 token）、画布 `rgb(20,20,20)`。probe 148/148；拖拽 17ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
