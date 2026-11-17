import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
// 找侧栏 footer 容器的样式定义（CSS 文本里出现 footer 的地方）
const hits = []
const re = /[.#][a-zA-Z0-9_-]*footer[a-zA-Z0-9_-]*\s*\{[^}]{0,400}\}/gi
let m
while ((m = re.exec(s)) !== null) {
  const txt = m[0].replace(/\s+/g, ' ')
  if (txt.length > 30) hits.push(txt.slice(0, 300))
  if (hits.length > 12) break
}
console.log('footer 样式候选数:', hits.length)
for (const h of hits) console.log('-', h)
