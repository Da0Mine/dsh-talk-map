import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 提供 pinnedSessions（来自 workspaces.pinnedSessionIds）
t = t.replace(
  `  const activeSession = currentSessionId()`,
  `  const pinnedSessions = useMemo(() => new Set((workspaceState as { pinnedSessionIds?: readonly string[] }).pinnedSessionIds ?? []), [workspaceState])
  const activeSession = currentSessionId()`,
)

// 2) 主行加瞄准镜
t = t.replace(
  `              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({
                  sessionId: row.sessionId,
                  title: row.title,
                  pinned: pinnedSessions.has(row.sessionId),
                  x: event.clientX,
                  y: event.clientY,
                })
              }}`,
  `              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({
                  sessionId: row.sessionId,
                  title: row.title,
                  pinned: pinnedSessions.has(row.sessionId),
                  x: event.clientX,
                  y: event.clientY,
                })
              }}`,
)
// 在卡片开头插入 reticle（寻找主行卡片内的第一个 cardTop）
t = t.replace(
  `              <div className={styles['cardTop']}>
                <span className={styles['cardTitle']}>{row.title}</span>
              </div>`,
  `              {row.sessionId === activeSession
                ? <span className={styles['cardReticle']} aria-hidden="true"><i /><i /><i /><i /></span>
                : null}
              <div className={styles['cardTop']}>
                <span className={styles['cardTitle']}>{row.title}</span>
              </div>`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: pinnedSessions + 主行瞄准镜')
