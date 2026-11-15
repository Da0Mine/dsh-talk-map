import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes('A rail tap opens that conversation'))
if (at < 0) { console.log('anchor not found'); process.exit(1) }
const indent = lines[at].match(/^\s*/)[0]
const block = [
  '/**',
  ' * The conversation the map was opened from, as the rail\'s top block. Absent when that',
  ' * session has no card on this board (nothing to jump back to).',
  ' */',
  'const currentRailEntry = useMemo<StatusRailCurrent | undefined>(() => {',
  '  const sessionId = currentSessionId()',
  '  if (sessionId === undefined) return undefined',
  '  for (const [cardId, card] of Object.entries(visibleCards)) {',
  '    if (card.sessionId !== sessionId || card.boardId !== INBOX_BOARD_ID) continue',
  '    const summary = sessions.byId[sessionId]',
  '    const lamp = glowOf(sessionId)',
  '    const draft = draftTexts[sessionId]',
  '    const body = draft !== undefined && draft !== \'\' ? draft : previews[sessionId]',
  '    return {',
  '      cardId,',
  '      title: renamedTitles[sessionId] ?? summary?.displayTitle ?? sessionId,',
  '      ...(lamp !== undefined ? { lamp } : {}),',
  '      ...(body !== undefined ? { preview: body } : {}),',
  '      ...(summary?.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),',
  '    }',
  '  }',
  '  return undefined',
  '}, [visibleCards, sessions, renamedTitles, previews, draftTexts, statusById, alertById, finishedById])',
  '',
].map(line => indent + line)
lines.splice(at, 0, ...block)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('currentRailEntry inserted before line', at + 1)
