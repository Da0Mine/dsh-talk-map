import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b97 · /, 'b98 · ')
t = t.replace(/b97 · Search/, 'b98 · Search')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.98'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.97`', '最新 `0.1.98`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-23 `0.1.98`：玻璃按参考图（iOS26 胶囊）重做并取消状态切换——去掉白色雾层（那层白渐变就是"毛玻璃"来源），模糊 22→3px，厚亮边（2px 内亮线 + 外侧白环 + 内阴影做厚度），`data-frozen` 机制整体删除（实测始终模糊拖拽中位 17ms/p95 19–25ms，与冻结态无差）。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
