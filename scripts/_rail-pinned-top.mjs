import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 主列表前插入置顶的最近卡（同一种槽位渲染，走 renderCard）
const at = lines.findIndex(line => line.trim() === '{ordered.map((entry, index) => {')
if (at < 0) throw new Error('ordered.map not found')
lines.splice(at, 0,
  '          {pinnedRecentEntries.map(entry => (',
  '            <div key={entry.cardId} className={styles[`statusRailSlot`] ?? undefined}>',
  '              {renderCard(entry, false, false, event => { recentDrag.begin(event, entry.cardId) }, () => { if (!recentDrag.shouldIgnoreClick()) props.onOpen(entry.cardId) })}',
  '            </div>',
  '          ))}',
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('StatusRail: 置顶的最近卡提到最前')
