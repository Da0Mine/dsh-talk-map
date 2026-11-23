import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b203 · /g, 'b204 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.2.4'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.2.3`', '最新 `0.2.4`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.2.4`：修「侧栏折射消失」——面板与把手共用同一个 SVG 滤镜 id，后注册的把前一个顶掉（实测两个 `svg#dsh-talk-map-liquid-glass-svg`、两个 `filter#dsh-talk-map-liquid-glass`，面板那块是 272×844、把手那块 30×77）。改为每个实例自增 id（`-1`/`-2`），实测面板与把手各用自己的滤镜。另：冻结只在画布内起手时触发，并加 4s 看门狗，避免指针事件丢失后一直停在无折射状态。probe 148/148；200 张拖拽 17ms/p95 20ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
