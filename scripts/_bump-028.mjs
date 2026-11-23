import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b207 · /g, 'b208 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.8'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.7`', '最新 `0.2.8`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.8`：亮度对齐原样——面板 72%→92%、卡片 88%→96%；实测面板 `oklab L=0.2008 / 0.92` ≈ 应用底色 `rgb(21,21,23)`，卡片 `L=0.2565 / 0.96` ≈ `rgb(35,35,36)`（与原始 token 一致）。同时把折射带 44→36、位移 30→22，减少宽带宽把面板外侧近黑像素拉进来造成的"整体变暗"错觉。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
