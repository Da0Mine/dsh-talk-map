import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 不再整体卸载
t = t.replace(
  `  if (rows.length === 0) return null

`,
  `  // The board stays mounted even with nothing queued: hiding it made the whole section vanish
  // from the sidebar, which read as a bug rather than as "no tasks".

`,
)

// 2) 空列表给一句提示
t = t.replace(
  `        {rows.map((row) => {`,
  `        {rows.length === 0
          ? <div className={styles['sidebarQueueEmpty']}>{t('statusRail.empty')}</div>
          : null}
        {rows.map((row) => {`,
)

fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 空队列不再卸载，显示提示')
