import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// 找到卡片 data 里 preview 那两行（第一次出现、在 liveNodes 的 cardNodes 里）
const at = lines.findIndex((l, i) => l.includes('...(previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),')
  && lines[i + 1] && lines[i + 1].includes('pinnedSessions.has(card.sessionId)'))
if (at < 0) { console.log('preview block not found'); process.exit(1) }
const indent = lines[at].match(/^\s*/)[0]
lines.splice(at, 1,
  indent + '// 待发送优先：卡片正文显示草稿本身，而不是上一句已发送的内容。',
  indent + '...((draftTexts[card.sessionId] ?? \'\') !== \'\'',
  indent + '  ? { preview: draftTexts[card.sessionId] }',
  indent + '  : previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),',
)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('card body prefers the draft (line', at + 1, ')')

let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  '  }, [visibleCards, sessions, renamedTitles, previews, pinnedSessions, statusById, alertById, finishedById])',
  '  }, [visibleCards, sessions, renamedTitles, previews, draftTexts, pinnedSessions, statusById, alertById, finishedById])',
)
fs.writeFileSync(file, text, 'utf8')
console.log('deps updated')
