import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 主列表先渲染置顶的最近卡
const at = lines.findIndex(line => line.trim() === '{rows.map((row) => {')
if (at < 0) throw new Error('rows.map not found')
lines.splice(at, 0,
  '        {pinnedExtraRows.map((row) => {',
  '          // Pinned recent sessions rendered with the queue row look (and the 📌 marker).',
  '          return (',
  '            <div',
  '              key={`pin-${row.sessionId}`}',
  '              className={`${styles[`card`] ?? \'\'} ${styles[`statusRailCard`] ?? \'\'} ${styles[`sidebarQueueCard`] ?? \'\'}`}',
  '              style={{ width: \'100%\', maxWidth: \'100%\', boxSizing: \'border-box\', flex: \'none\', alignSelf: \'stretch\' }}',
  '              onClick={() => { openSessionInUi(row.sessionId); setOpened(current => new Set([...current, row.sessionId])) }}',
  '              onContextMenu={(event) => {',
  '                event.preventDefault()',
  '                setMenu({ sessionId: row.sessionId, title: row.title, pinned: isPinnedSession(localPinSet, row.sessionId), x: event.clientX, y: event.clientY })',
  '              }}',
  '            >',
  '              <div className={styles[`cardTop`]}>',
  '                <span className={styles[`cardTitle`]}>{row.title}</span>',
  '                <span className={styles[`cardPinIcon`]} title="已置顶" aria-hidden="true">📌</span>',
  '              </div>',
  '              {(previews[row.sessionId] ?? \'\').trim() !== \'\'',
  '                ? <div className={styles[`cardSummary`]}>{previews[row.sessionId]}</div>',
  '                : null}',
  '              <div className={styles[`cardFooter`]}>',
  '                <span className={styles[`cardTime`]}>{relativeTime(row.updatedAt)}</span>',
  '              </div>',
  '            </div>',
  '          )',
  '        })}',
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('SidebarQueue: 主列表前置置顶卡')
