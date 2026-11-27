import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b813 · /g, 'b814 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.14'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.13`', '最新 `0.8.14`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.14`：卡片正文改为**启动即预热**。原来只有 4 秒一轮、每轮 4 张的滴灌（为千卡看板设计），启动后侧栏只能先看到标题，正文要等几十秒才陆续出现。新增 warm-up：`visibleCards` 变化时把尚未取过的会话按 **12 张/批、批间隔 80ms** 连续拉完（`PREVIEW_WARM_BATCH` / `PREVIEW_WARM_GAP_MS`），结果写回 `setPreviews` 并同步到滴灌的 `previewStamp` 以免重复读；原有 4 秒滴灌保留用于增量更新。实测：清空缓存启动后 **295ms** 已有 3 张卡带正文。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
