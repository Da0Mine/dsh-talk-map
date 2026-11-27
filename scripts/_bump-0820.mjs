import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b819 · /g, 'b820 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.20'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.19`', '最新 `0.8.20`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-28 `0.8.20`：修「标题要等一会儿才出来」的真因——`ghost: summary === undefined`。会话列表还没 hydrate 时 `summary` 必然是 undefined，于是**每张卡都被判成幽灵卡**，`SessionCard` 直接渲染 `card.ghostTitle`（会话已不存在），把 0.8.19 的缓存标题完全盖住；列表一到才变回真标题。改为 `ghost: sessions.ids.length > 0 && summary === undefined`：只有"列表已加载且确实找不到该会话"才是 ghost。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
