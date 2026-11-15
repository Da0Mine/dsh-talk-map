import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// 1) 把误插到 statusEntries 里的草稿优先逻辑还原成原来的单行
const wrongAt = lines.findIndex(l => l.includes('待发送优先：卡片正文显示草稿本身'))
if (wrongAt >= 0) {
  const indent = lines[wrongAt].match(/^\s*/)[0]
  lines.splice(wrongAt, 4,
    indent + '...(previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),',
  )
  console.log('statusEntries 还原 @', wrongAt + 1)
}

// 2) 在 liveNodes（第 998 行那处）插入草稿优先
const targetAt = lines.findIndex((l, i) => i > 960 && l.trim() === '...(previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),')
if (targetAt < 0) { console.log('liveNodes preview line not found'); process.exit(1) }
const indent = lines[targetAt].match(/^\s*/)[0]
lines.splice(targetAt, 1,
  indent + '// 待发送优先：卡片正文显示草稿本身，而不是上一句已发送的内容。',
  indent + '...((draftTexts[card.sessionId] ?? \'\') !== \'\'',
  indent + '  ? { preview: draftTexts[card.sessionId] }',
  indent + '  : previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),',
)
console.log('liveNodes 插入 @', targetAt + 1)

// 3) liveNodes 的依赖数组补 draftTexts
const depsAt = lines.findIndex(l => l.trim().startsWith('}, [frameRects, folderLayouts, foldedCards, foldedSet, cardLayout'))
if (depsAt < 0) { console.log('liveNodes deps not found'); process.exit(1) }
if (!lines[depsAt].includes('draftTexts')) {
  lines[depsAt] = lines[depsAt].replace('previews,', 'previews, draftTexts,')
  if (!lines[depsAt].includes('draftTexts')) {
    lines[depsAt] = lines[depsAt].replace('[', '[draftTexts, ')
  }
}
console.log('deps:', lines[depsAt].trim().slice(0, 160))
fs.writeFileSync(file, lines.join('\n'), 'utf8')
