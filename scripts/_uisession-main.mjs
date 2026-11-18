import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const at = s.indexOf('var UiSession=class extends')
const seg = s.slice(at, at + 9000)
// 找 publishMain / isMain / retain 相关实现
for (const key of ['publishMain()', 'isMain(', 'retainMain', 'clearCompletion', 'markRead']) {
  const i = seg.indexOf(key)
  if (i < 0) { console.log(key, '→ 未找到'); continue }
  console.log('----', key)
  console.log(seg.slice(i, i + 420).replace(/\s+/g, ' '))
  console.log()
}
