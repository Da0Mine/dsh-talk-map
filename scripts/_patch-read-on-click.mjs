import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')

// 1) isMain（宿主 retainedBy.mainView）视为已读：不再算 done
t = t.replace(
  `  if (status?.completionUnread === true || finished.has(sessionId)) return 'done'
  return undefined`,
  `  // A session that is currently the main view has been read — the Host reconciles this
  // asynchronously, so honour the same rule here instead of keeping a stale lamp.
  const isMain = (summary?.retainedBy?.mainView ?? 0) > 0
  if (!isMain && (status?.completionUnread === true || finished.has(sessionId))) return 'done'
  return undefined`,
)

// 2) 点击卡片时：先清掉本插件自己的"已跑完未读"记录，再跳转
t = t.replace(
  `              onClick={() => {
                closeMapPanel()
                openSessionInUi(row.sessionId)
              }}`,
  `              onClick={() => {
                // Drop this plugin's own "finished, unread" mark immediately: it is only
                // ever cleared when the map panel remounts, which is why the card used to
                // linger until the map was opened.
                sessionActivity.forget(row.sessionId)
                closeMapPanel()
                openSessionInUi(row.sessionId)
              }}`,
)
t = t.replace(
  `              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                closeMapPanel()
                openSessionInUi(row.sessionId)
              }}`,
  `              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                sessionActivity.forget(row.sessionId)
                closeMapPanel()
                openSessionInUi(row.sessionId)
              }}`,
)
fs.writeFileSync(file, t, 'utf8')
console.log('SidebarQueue: clear on click + skip main-view sessions')
