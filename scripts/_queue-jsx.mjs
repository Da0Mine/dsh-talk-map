import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 主行：挂 ref + pointerdown + 拖动位移
t = t.replace(
  `            <div
              key={row.cardId}
              className={\`\${styles['card']} \${row.lamp === undefined ? '' : styles[LAMP_CLASS[row.lamp]] ?? ''} \${styles['statusRailCard']} \${styles['sidebarQueueCard']}\`}`,
  `            <div
              key={row.cardId}
              ref={element => { queueDrag.register(row.sessionId, element) }}
              onPointerDown={event => { queueDrag.begin(event, row.sessionId) }}
              className={\`\${styles['card']} \${row.lamp === undefined ? '' : styles[LAMP_CLASS[row.lamp]] ?? ''} \${styles['statusRailCard']} \${styles['sidebarQueueCard']}\`}`,
)
t = t.replace(
  `              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 'none', alignSelf: 'stretch' }}
              data-talkmap-queue={row.sessionId}`,
  `              style={{
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                flex: 'none',
                alignSelf: 'stretch',
                touchAction: 'none',
                ...(queueDrag.draggingId === row.sessionId
                  ? { transform: \`translateY(\${queueDrag.offsetY}px)\`, zIndex: 3 }
                  : {}),
              }}
              data-talkmap-queue={row.sessionId}`,
)

// 最近区：改成有序列表 + 拖拽 + 正文
t = t.replace(
  `                {recentRows.map((row) => (
                  <div
                    key={'recent-' + row.sessionId}`,
  `                {recentRowsOrdered.map((row) => (
                  <div
                    key={'recent-' + row.sessionId}
                    ref={element => { recentDrag.register(row.sessionId, element) }}
                    onPointerDown={event => { recentDrag.begin(event, row.sessionId) }}`,
)
t = t.replace(
  `                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 'none', alignSelf: 'stretch' }}
                  data-talkmap-queue-recent={row.sessionId}`,
  `                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    flex: 'none',
                    alignSelf: 'stretch',
                    touchAction: 'none',
                    ...(recentDrag.draggingId === row.sessionId
                      ? { transform: \`translateY(\${recentDrag.offsetY}px)\`, zIndex: 3 }
                      : {}),
                  }}
                  data-talkmap-queue-recent={row.sessionId}`,
)
// 最近卡片补正文
t = t.replace(
  `                  <div className={styles['cardTop']}>
                    <span className={styles['cardTitle']}>{row.title}</span>
                  </div>
                  <div className={styles['cardFooter']}>
                    <span className={styles['cardTime']}>{relativeTime(row.updatedAt)}</span>
                  </div>`,
  `                  <div className={styles['cardTop']}>
                    <span className={styles['cardTitle']}>{row.title}</span>
                  </div>
                  {(previews[row.sessionId] ?? '').trim() !== ''
                    ? <div className={styles['cardSummary']}>{previews[row.sessionId]}</div>
                    : null}
                  <div className={styles['cardFooter']}>
                    <span className={styles['cardTime']}>{relativeTime(row.updatedAt)}</span>
                  </div>`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 两段都接上拖拽，最近卡补正文')
