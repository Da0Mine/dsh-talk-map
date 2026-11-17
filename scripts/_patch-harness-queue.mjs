import fs from 'node:fs'
const file = 'test/harness.js'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes("if (path.includes('/talk-map/cards/upsert') && body !== null) {"))
if (at < 0) { console.log('anchor missing'); process.exit(1) }
const indent = lines[at].match(/^\s*/)[0]
lines.splice(at, 0,
  indent + '// The native sidebar queue: cards joined with their session titles.',
  indent + "if (path.includes('/talk-map/queue')) {",
  indent + '  const sessionIds = Object.values(payload.cards ?? {}).map(card => card.sessionId)',
  indent + '  const sessions = payload.sessions ?? []',
  indent + '  const entries = sessionIds.map((sessionId, index) => {',
  indent + '    const summary = sessions.find(item => item.sessionId === sessionId)',
  indent + '    return {',
  indent + '      cardId: Object.keys(payload.cards).find(id => payload.cards[id].sessionId === sessionId) ?? `card-${index}`,',
  indent + '      sessionId,',
  indent + '      title: summary?.displayTitle ?? sessionId,',
  indent + "      ...(summary?.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),",
  indent + '    }',
  indent + '  })',
  indent + '  entries.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))',
  indent + '  return json({ entries })',
  indent + '}',
)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('harness queue stub added @', at + 1)
