import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b702 · /g, 'b703 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.3'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.2`', '最新 `0.7.3`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-26 `0.7.3`：① 失败邮件根因＝`.github/workflows/publish.yml` 由 `push: tags: v*` 触发（每次建 Release 都会打 v* 标签）→ 和本地已发布版本冲突 → 每次失败；改为仅手动 `workflow_dispatch` + 「版本已存在则跳过」守卫；② 修「最近卡拖不动」：`renderCard(entry, false, true, handler)` 里 `interactive=true` 让 pointerdown 走向旧的队列拖拽，改成 `false` 后自定义处理器才生效（实测拖动后顺序改变）；③ 新增 `src/client/rail-menu.tsx` 右键菜单（置顶/取消置顶、标为未读、重命名、查看摘要、归档会话），两侧栏卡片都挂上，实测菜单 5 项；④ 外侧栏「任务中」卡片补 `.cardReticle`，`pinnedSessions` 由 `workspaces.pinnedSessionIds` 派生。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
