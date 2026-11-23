import fs from 'node:fs'
const f = 'test/harness.js'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes("talk-map/last-user"))
if (at < 0) throw new Error('stub not found')
// 找出 'const texts = {}' 之后连续两个 '}' 里的第一个并删掉
let removed = 0
for (let i = at; i < at + 14 && i < lines.length - 1; i += 1) {
  if (lines[i].trim() === '}' && lines[i + 1].trim() === '}') {
    lines.splice(i, 1)
    removed += 1
    break
  }
}
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('删除多余右括号:', removed)
