import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace(/b808 · /g, 'b809 · ')
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.8.9'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.8.8`', '最新 `0.8.9`')
const entry = [
  '## 已完成',
  '',
  '- 2026-11-27 `0.8.9`：「最近的任务」改为**按最后看完时间倒序**（谁最后看谁在顶）。原来按完成时间排，同时完成的 a、b 谁先看谁先看都一个样。排序键 = `readArchive` 的已读时间（`acknowledge`/`forget` 时写入），没有已读记录时退回完成历史时间；两侧栏同规则。实测对照：预置读时间 `s4 最后` → 顶部为 Matter 卡；改成 `s3 最后` → 顶部换成云盘同步目录，两次列表正好互为倒序。probe 150/150。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
