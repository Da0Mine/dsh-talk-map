import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b502 · /g, 'b503 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.5.3'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.5.2`', '最新 `0.5.3`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.5.3`：面板与把手统一为「薄玻璃」——面板 `linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.02) 45%, rgba(255,255,255,.035))` + `inset 0 0 0 1px rgba(255,255,255,.09)`；把手同款（白渐变 + 1px 亮边）并**去掉插件自带 `blur(16px)`+52% 填充**（那就是"毛玻璃"观感）。面板仍无 `backdrop-filter`。卡片 45% 底。说明：`feDisplacementMap` 在本宿主不渲染（多次实测 0 像素差），因此"折射"无法实现，玻璃感只能靠半透 + 高光边。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
