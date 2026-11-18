import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// 找到 rows memo 里的筛选与排序
const skipAt = lines.findIndex(l => l.includes("if (lamp === undefined) continue"))
if (skipAt < 0) { console.log('skip not found'); process.exit(1) }
const indent = lines[skipAt].match(/^\s*/)[0]
lines.splice(skipAt, 1,
  ... [
    '      // Draft-only cards join at the lowest priority (after every lamped card).',
    '      const draftText = drafts[card.sessionId]',
    "      const hasDraft = draftText !== undefined && draftText.trim() !== ''",
    '      if (lamp === undefined && !hasDraft) continue',
    "      if (lamp === 'done' && opened.has(card.sessionId)) continue",
    '      const draftOnly = lamp === undefined',
  ].map(l => indent + l),
)

// 去掉后面那两行旧的（done 过滤 + push）里的重复判断
let text = lines.join('\n')
text = text.replace(
  `      // Opened from here already: stop showing the "done, unread" card, it is read now.
      if (lamp === 'done' && opened.has(card.sessionId)) continue
`,
  '',
)
text = text.replace(
  `      out.push({
        cardId,
        sessionId: card.sessionId,
        title: summary?.displayTitle ?? card.sessionId,
        lamp,`,
  `      out.push({
        cardId,
        sessionId: card.sessionId,
        title: summary?.displayTitle ?? card.sessionId,
        ...(draftOnly ? { draft: true } : { lamp }),
        ...(draftText !== undefined ? { draftText } : {}),`,
)
// 排序：带灯的在前（按更新时间），待发送垫底
text = text.replace(
  `    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))`,
  `    out.sort((a, b) => {
      const aDraft = a.draft === true ? 1 : 0
      const bDraft = b.draft === true ? 1 : 0
      if (aDraft !== bDraft) return aDraft - bDraft
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })`,
)
// 行类型：lamp 可选 + draft 标记
text = text.replace(
  "const out: { cardId: string; sessionId: string; title: string; lamp: CardGlow; updatedAt?: number; draft?: string }[] = []",
  "const out: { cardId: string; sessionId: string; title: string; lamp?: CardGlow; draft?: boolean; draftText?: string; updatedAt?: number }[] = []",
)
fs.writeFileSync(file, text, 'utf8')
console.log('sidebar rows: draft-only support added')
