import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes('const statusEntries = useMemo<StatusRailEntry[]>'))
if (at < 0) { console.log('statusEntries not found'); process.exit(1) }
const skipAt = lines.findIndex((l, i) => i > at && i < at + 8 && l.includes('if (lamp === undefined) continue'))
if (skipAt < 0) { console.log('skip line not found'); process.exit(1) }
const indent = lines[skipAt].match(/^\s*/)[0]
lines.splice(skipAt, 1, ...
  [
    '      if (lamp === undefined) {',
    '        // Unsent text with no lamp: lowest priority, listed after every lamped card.',
    '        const draftText = draftTexts[card.sessionId]',
    "        if (draftText === undefined || draftText.trim() === '') continue",
    '        const draftSummary = sessions.byId[card.sessionId]',
    '        rows.push({',
    '          cardId,',
    '          sessionId: card.sessionId,',
    '          title: renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? card.sessionId,',
    '          stamp: draftSummary?.updatedAt ?? 0,',
    '          draft: true,',
    '          ...(draftSummary?.updatedAt !== undefined ? { updatedAt: draftSummary.updatedAt } : {}),',
    '          preview: draftText,',
    '          ...(pinnedSessions.has(card.sessionId) ? { pinned: true } : {}),',
    '        })',
    '        continue',
    '      }',
  ].map(l => indent + l),
)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('MapCanvas: draft-only statusEntries rows inserted')
