import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b706 · /g, 'b707 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.7'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.6`', '最新 `0.7.7`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.7.7`：① 拖拽改用**渲染顺序**的 id 列表（此前传的是 props 顺序，向上拖时索引与画面不一致 → 卡片"飞出"、松手排序错乱）；② 侧栏主行拖拽加 `bucketOf` 限制，只能在自己的优先级桶里换位；③ 拖拽后 350ms 内抑制 onClick（`shouldIgnoreClick`），松手不再误进对话，普通单击仍可进；④ 补 host 路由 `POST /talk-map/digest/ensure`——客户端一直在调，host 只有 `/refresh`，所以"查看摘要"永远 404；⑤ 菜单动作失败时把原因显示在菜单里（此前只 console，看不出"置顶没反应"是接口缺失还是失败）。实测：向上拖「云盘同步目录」到首位成功，且拖完地图仍开着；probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
