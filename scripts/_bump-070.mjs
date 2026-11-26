import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b602 · /g, 'b700 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.0'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.6.2`', '最新 `0.7.0`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-26 `0.7.0`：① 两侧栏新增「最近的任务」——无灯无草稿的卡片按 `updatedAt` 倒序最多取 3 张，排在带状态卡片下方（`MapCanvas.recentEntries` → `StatusRail.recent`；`SidebarQueue.recentRows`），分隔标题 `statusRail.recent`；② 当前会话的卡片加"瞄准镜"角标（复用 `.cardReticle`，面板 `currentSessionId` / 侧栏 `currentSessionId()`）；③ 修 issue #7 安全漏洞：`sameOrigin()` 原先比较 `Origin` 与 `Host`（DNS rebinding 下两者都由攻击页控制），抽出 `src/host/origin.ts`，改为 **Host 必须是回环名/127.0.0.0-8**，`Origin` 缺省需回环、`dsh-app://` 允许 `Host: app`；新增 `test/origin.test.mjs` 8 条用例覆盖 issue 复现用例（含 rebinding 两条），全通过。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
