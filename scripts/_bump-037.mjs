import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b306 · /g, 'b307 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.3.7'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.3.6`', '最新 `0.3.7`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.3.7`：把手玻璃按"面板材质的延伸"处理——新增可选 `specularBezel`，把手高光带收到 6px（插件默认按 `safeBezel*2.5` 会到 25px，30px 宽的把手会整块泛白，这就是之前的"毛玻璃"），底色仍 0；滤镜只在**关闭态**挂载（`useEffect` 依赖 `open`）。实测展开态 `tabFilter = none / tabBg 透明 / panelFilter = url(#...-1) / panelBg 透明` → 单一表面；关闭态 `tabFilter = url(#...-2)`。probe 148/148；拖拽 17ms/p95 19ms。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
