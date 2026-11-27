import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b708 · /g, 'b709 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.7.9'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.7.8`', '最新 `0.7.9`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.7.9`：菜单动作结果改为**应用内 toast**（`railMenuToast`，body portal，4 秒）：置顶→「已置顶（本地）」、标未读→「已标为未读」、摘要→「摘要已打开」/「这个会话还没有摘要（摘要层未生成）」、失败→「失败：<原因>」。此前只有 `console.error`，用户侧完全看不到执行没执行。用途：用户点一次即可报出真实失败原因，避免我们盲改。probe 150/150；harness 内点置顶后 `pins=["s5"]` 且最近区顺序改变。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
