import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b205 · /g, 'b206 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.6'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.5`', '最新 `0.2.6`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.6`：按用户要求加大折射——面板 `bezel 26→44`、`scale 14→30`、`ior 2.2→2.5`、`thickness 90→120`、`specular 0.3→0.34`；把手同步 `bezel 14→22 / scale 8→16 / ior 2.4`。视觉检查（亮背板 + 顶角裁剪）无重影，仅顶部边缘出现更厚的玻片拉伸带。probe 148/148；200/800 张拖拽中位 17ms、p95 34ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
