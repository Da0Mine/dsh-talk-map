import fs from 'node:fs'

// MapCanvas：门槛换 history + 按完成历史排序 + 依赖补齐
{
  const f = 'src/client/MapCanvas.tsx'
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  let gateAt = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes('readFinished.has(card.sessionId)')) { gateAt = i; break }
  }
  if (gateAt < 0) throw new Error('gate line missing')
  lines[gateAt] = lines[gateAt].replace('readFinished.has(card.sessionId)', 'finishHistory.has(card.sessionId)')
  const sortAt = lines.findIndex(line => line.includes('rows.sort((a, b) => (b.updatedAt ?? 0)'))
  if (sortAt >= 0) {
    lines[sortAt] = '    // Newest completion first: updatedAt stops moving once the 待查看 is read.'
    lines.splice(sortAt + 1, 0, '    rows.sort((a, b) => (finishHistory.get(b.sessionId) ?? 0) - (finishHistory.get(a.sessionId) ?? 0))')
  }
  const depsAt = lines.findIndex(line => line.includes('}, [visibleCards, sessions, statusEntries, renamedTitles, previews])'))
  if (depsAt >= 0) lines[depsAt] = lines[depsAt].replace('previews])', 'previews, finishHistory])')
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('MapCanvas: history 门槛/排序/依赖')
}

// SidebarQueue：门槛换 history，去掉 readArchive 依赖
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace('if (!readFinished.has(sessionId)) continue', 'if (!finishHistory.has(sessionId)) continue')
  t = t.replace(`import { readArchive } from './read-archive.ts'\n`, '')
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: history 门槛')
}
