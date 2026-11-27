import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 1) 渲染列表改用可见集
const mapAt = lines.findIndex(line => line.trim() === '{recentRowsOrdered.map((row) => (')
if (mapAt < 0) throw new Error('recent render line not found')
lines[mapAt] = lines[mapAt].replace('recentRowsOrdered.map', 'visibleRecentRows.map')

// 2) 找最近区块结尾：从 mapAt 起找 `))}` 后接 `              )` 的收尾
let closeAt = -1
for (let i = mapAt; i < lines.length; i += 1) {
  if (lines[i].trim() === '))}' && (lines[i + 1] ?? '').trim() === ')') { closeAt = i + 1; break }
}
if (closeAt < 0) throw new Error('recent block close not found')
lines.splice(closeAt + 1, 0,
  '              {hasMoreRecent',
  '                ? (',
  '                    <button',
  '                      type="button"',
  '                      className={styles[`sidebarQueueMore`]}',
  '                      onClick={() => { setRecentLimit(current => current + RECENT_PAGE_SIZE) }}',
  '                    >',
  '                      {t(`statusRail.more`)}',
  '                    </button>',
  '                  )',
  '                : null}',
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('渲染与按钮已插入（按钮在第', closeAt + 2, '行）')
