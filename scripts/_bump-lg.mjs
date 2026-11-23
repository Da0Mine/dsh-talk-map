import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b98 · /g, 'b99 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.99'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.98`', '最新 `0.1.99`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.1.99`：移植 EchoMusic `echo-liquid-glass` 的真实折射（Snell 剖面 → Canvas 位移贴图 → SVG `feDisplacementMap` 作为 `backdrop-filter`），新增 `src/client/liquid-glass.ts`，`StatusRail` 挂载；面板底色 44%、圆角 22、描边高光。性能：200 张卡拖拽中位 17ms/p95 26ms；1600 张 p95 49–55ms（折射滤镜随背景重算）。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
