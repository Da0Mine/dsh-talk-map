import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b95 · 搜地图上的卡片（标题/正文）'", "'b96 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b95 · Search cards on the map'", "'b96 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.96'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.95`', '最新 `0.1.96`')
const entry = [
  '## 已完成',
  '',
  '- **地图侧栏液态玻璃**（`0.1.96`）：面板从 94% 不透明的实色改成半透明渐变 + `backdrop-filter: blur(16px) saturate(190%) brightness(1.08)`；`::before` 做镜面高光、`::after` 用 mask-composite 做 1px 折射边；`.railSheen` 是缓慢漂移的光带（`prefers-reduced-motion` 下关闭）；侧栏卡片改成 70% 透明的玻璃瓦片 + 菲涅尔边。性能：首次实测侧栏展开时拖拽中位 33ms/p95 91ms（800 张卡），改为「静止才模糊」——画布移动时 `data-frozen=1` 换成静态渐变、卡片去掉嵌套 `backdrop-filter`、冻结状态走独立 store（`rail-glass.ts`，不触发画布重渲染）——同页面 A/B 预热后玻璃开/关均为中位 17ms、p95 19ms；实测 `data-frozen` 拖动中为 1、松手 400ms 后回 0，静止时 `backdrop-filter: blur(16px) saturate(1.9) brightness(1.08)`。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
