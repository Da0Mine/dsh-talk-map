import fs from 'node:fs'
const f = 'src/client/i18n.ts'
const lines = fs.readFileSync(f, 'utf8').split('\n')
if (lines.some(l => l.includes("'toast.importCapped'"))) { console.log('已存在'); process.exit(0) }
const zhAt = lines.findIndex(l => l.includes("'toast.workspaceTrashed'"))
let enAt = lines.findIndex((l, i) => i > zhAt && l.includes("'toast.workspaceTrashed'"))
if (zhAt < 0 || enAt < 0) throw new Error('anchors missing')
const zhIndent = lines[zhAt].match(/^\s*/)[0]
const enIndent = lines[enAt].match(/^\s*/)[0]
lines.splice(enAt + 1, 0, enIndent + "'toast.importCapped': 'placed {n} cards; {more} sessions left for a later import or sync',")
lines.splice(zhAt + 1, 0, zhIndent + "'toast.importCapped': '已放入 {n} 张卡片，另有 {more} 个会话留到下次导入或同步',")
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('i18n: toast.importCapped 中英各一条')
