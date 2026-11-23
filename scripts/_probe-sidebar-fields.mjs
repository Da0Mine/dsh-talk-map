import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const n of ['lastUserMessage', 'lastMessageText', 'previewText', 'summaryPreview', 'firstUserMessage', 'snippet']) {
  const hits = []
  let i = 0
  while (hits.length < 3) { i = s.indexOf(n, i + 1); if (i < 0) break; hits.push(i) }
  console.log(n, '->', hits.length === 0 ? '无' : hits.join(','))
}
const at = s.indexOf('displayTitle')
console.log('--- displayTitle 上下文 ---')
console.log(s.slice(Math.max(0, at - 150), at + 180).replace(/\s+/g, ' '))
