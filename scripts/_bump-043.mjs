import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b402 · /g, 'b403 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.4.3'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.4.2`', '最新 `0.4.3`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-24 `0.4.3`：面板与把手拼成一整块玻璃——共用一条外轮廓（面板只画上/下边，把手画上/右/下边，接缝不画竖线），两者均透明底、无阴影、无各自滤镜。核对时发现插件用的 `--dsw-alias-border-secondary` **在宿主主题里不存在**（宿只有 `border-l1 #0000000a` / `border-l2 #0000001a`），所以插件原本那些边框一直是失效的；改用字面值 `rgba(255,255,255,.16)` 后实测 panel `border 1px 0 1px 0`、tab `1px 1px 1px 0`、radius 均 `0 20 20 0`。probe 148/148。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
