import fs from 'node:fs'

// StatusRail
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `                        transform: \`translateY(\${dragging ? recentDrag.offsetY : recentDrag.shiftOf(entry.cardId)}px)\`,
                        transition: dragging ? 'none' : 'transform 120ms ease',`,
    `                        transform: \`translateY(\${dragging ? recentDrag.offsetY : recentDrag.shiftOf(entry.cardId) + recentDrag.flipOf(entry.cardId)}px)\`,
                        transition: dragging || recentDrag.flipping ? 'none' : 'transform 150ms ease',`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: FLIP 样式')
}

// SidebarQueue（主行 + 最近行）
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `                transform: \`translateY(\${queueDrag.draggingId === row.sessionId ? queueDrag.offsetY : queueDrag.shiftOf(row.sessionId)}px)\`,
                transition: queueDrag.draggingId === row.sessionId ? 'none' : 'transform 120ms ease',`,
    `                transform: \`translateY(\${queueDrag.draggingId === row.sessionId ? queueDrag.offsetY : queueDrag.shiftOf(row.sessionId) + queueDrag.flipOf(row.sessionId)}px)\`,
                transition: queueDrag.draggingId === row.sessionId || queueDrag.flipping ? 'none' : 'transform 150ms ease',`,
  )
  t = t.replace(
    `                    transform: \`translateY(\${recentDrag.draggingId === row.sessionId ? recentDrag.offsetY : recentDrag.shiftOf(row.sessionId)}px)\`,
                    transition: recentDrag.draggingId === row.sessionId ? 'none' : 'transform 120ms ease',`,
    `                    transform: \`translateY(\${recentDrag.draggingId === row.sessionId ? recentDrag.offsetY : recentDrag.shiftOf(row.sessionId) + recentDrag.flipOf(row.sessionId)}px)\`,
                    transition: recentDrag.draggingId === row.sessionId || recentDrag.flipping ? 'none' : 'transform 150ms ease',`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: FLIP 样式')
}
