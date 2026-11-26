import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 1) 把 useReorder 调用移到 recentEntriesOrdered 之后，并改用渲染顺序的 id
const dragLine = lines.findIndex(line => line.includes('const recentDrag = useReorder(recentIds, setRecentOrder)'))
if (dragLine < 0) throw new Error('recentDrag line not found')
lines.splice(dragLine, 1)
const memoEnd = lines.findIndex(line => line.includes('}, [props.recent, recentOrder])'))
if (memoEnd < 0) throw new Error('recentEntriesOrdered end not found')
lines.splice(memoEnd + 1, 0,
  '  const recentRenderedIds = recentEntriesOrdered.map(entry => entry.cardId)',
  '  const recentDrag = useReorder(recentRenderedIds, setRecentOrder)',
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('StatusRail: recentDrag 改用渲染顺序')
