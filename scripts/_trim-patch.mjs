import fs from 'node:fs'
// 从上一个脚本里只跑 MapCanvas 部分：删掉 i18n 段再执行
const src = fs.readFileSync('scripts/_patch-issue-sweep.mjs', 'utf8')
const cut = src.indexOf("// ── 5. strings")
const trimmed = src.slice(0, cut) + "\nconsole.log(edits.join('\\n'))\n"
fs.writeFileSync('scripts/_patch-issue-sweep-map.mjs', trimmed, 'utf8')
console.log('trimmed patch written')
