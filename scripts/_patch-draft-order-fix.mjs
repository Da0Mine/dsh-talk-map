import fs from 'node:fs'

// 1) 删掉把 draft 覆盖成字符串的那行
{
  const file = 'src/client/SidebarQueue.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const at = lines.findIndex(l => l.includes("...(drafts[card.sessionId] !== undefined ? { draft: drafts[card.sessionId] } : {}),"))
  if (at < 0) throw new Error('draft override line not found')
  lines.splice(at, 1)
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  console.log('SidebarQueue: removed the string draft override')
}

// 2) StatusRail：带灯的手动排序，待发送一律垫底
{
  const file = 'src/client/StatusRail.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const at = lines.findIndex(l => l.includes('const byId = new Map(props.entries.map(entry => [entry.cardId, entry]))'))
  if (at < 0) throw new Error('ordered body not found')
  // 替换 at..(return rows 行) 整段
  let end = at
  while (end < lines.length && !lines[end].includes('return rows')) end += 1
  if (end >= lines.length) throw new Error('ordered return not found')
  const indent = lines[at].match(/^\s*/)[0]
  lines.splice(at, end - at + 1,
    ...[
      'const byId = new Map(props.entries.map(entry => [entry.cardId, entry]))',
      'const rows: StatusRailEntry[] = []',
      'for (const cardId of order) {',
      '  const entry = byId.get(cardId)',
      '  if (entry !== undefined && entry.lamp !== undefined) rows.push(entry)',
      '}',
      'for (const entry of props.entries) {',
      '  if (entry.lamp !== undefined && !order.includes(entry.cardId)) rows.push(entry)',
      '}',
      '// Draft-only cards always sit at the bottom (lowest priority), newest first.',
      'const drafts = props.entries',
      '  .filter(entry => entry.lamp === undefined)',
      '  .sort((a, b) => b.stamp - a.stamp)',
      'return [...rows, ...drafts]',
    ].map(l => indent + l),
  )
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  console.log('StatusRail: drafts appended after lamped rows')
}
