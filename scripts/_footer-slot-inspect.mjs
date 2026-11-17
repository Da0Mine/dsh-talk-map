import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const at = s.indexOf('sidebar.footer.action')
console.log('首次出现位置', at)
// 找 footer.action 在渲染处的用法
let idx = 0, shown = 0
while (shown < 3) {
  idx = s.indexOf('footer.action', idx + 1)
  if (idx < 0) break
  const seg = s.slice(Math.max(0, idx - 420), idx + 260).replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ')
  console.log('----', idx, seg.slice(0, 640))
  shown += 1
}
