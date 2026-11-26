import fs from 'node:fs'

// 1) map-state: 批量意图
{
  const f = 'src/client/map-state.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('claimBatchIntent')) {
    t += `
/**
 * "Enter batch mode with this session" handed from a rail to the map panel: the rail can be
 * outside React (the sidebar queue), so the intent travels through the module instead of props.
 */
let pendingBatchSession: string | null = null

export function requestBatch(sessionId: string): void {
  pendingBatchSession = sessionId
}

export function claimBatchIntent(): string | null {
  const value = pendingBatchSession
  pendingBatchSession = null
  return value
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('map-state: requestBatch/claimBatchIntent')
  }
}

// 2) rail-menu: 删除 / 批量
{
  const f = 'src/client/rail-menu.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `import { archiveSessions, setPinned } from './session-actions.ts'`,
    `import { archiveSessions, setPinned, trashSessions } from './session-actions.ts'`,
  )
  t = t.replace(
    `import { DigestDialog } from './DigestDialog.tsx'`,
    `import { DigestDialog } from './DigestDialog.tsx'\nimport { openMapPanel, requestBatch } from './map-state.ts'`,
  )
  t = t.replace(
    `    {
      key: 'archive',
      icon: 'archive',
      label: t('menu.archive'),
      onPick: () => { run(() => archiveSessions([props.target.sessionId])) },
    },
  ]`,
    `    {
      key: 'archive',
      icon: 'archive',
      label: t('menu.archive'),
      onPick: () => { run(() => archiveSessions([props.target.sessionId])) },
    },
    {
      key: 'batch',
      icon: 'batch',
      label: t('menu.batch'),
      onPick: () => {
        // Hand the pick to the map panel, which owns batch mode.
        requestBatch(props.target.sessionId)
        openMapPanel()
        props.onClose()
      },
    },
    {
      key: 'delete-session',
      icon: 'delete',
      label: t('menu.deleteSession'),
      danger: true,
      onPick: () => { run(() => trashSessions([props.target.sessionId])) },
    },
  ]`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('rail-menu: 加 批量操作 / 删除会话')
}

// 3) SidebarQueue: 位移用 shiftOf + 发光留白
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `                touchAction: 'none',
                ...(queueDrag.draggingId === row.sessionId
                  ? { transform: \`translateY(\${queueDrag.offsetY}px)\`, zIndex: 3 }
                  : {}),`,
    `                touchAction: 'none',
                transform: \`translateY(\${queueDrag.draggingId === row.sessionId ? queueDrag.offsetY : queueDrag.shiftOf(row.sessionId)}px)\`,
                transition: queueDrag.draggingId === row.sessionId ? 'none' : 'transform 120ms ease',
                ...(queueDrag.draggingId === row.sessionId ? { zIndex: 3, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' } : {}),`,
  )
  t = t.replace(
    `                    touchAction: 'none',
                    ...(recentDrag.draggingId === row.sessionId
                      ? { transform: \`translateY(\${recentDrag.offsetY}px)\`, zIndex: 3 }
                      : {}),`,
    `                    touchAction: 'none',
                    transform: \`translateY(\${recentDrag.draggingId === row.sessionId ? recentDrag.offsetY : recentDrag.shiftOf(row.sessionId)}px)\`,
                    transition: recentDrag.draggingId === row.sessionId ? 'none' : 'transform 120ms ease',
                    ...(recentDrag.draggingId === row.sessionId ? { zIndex: 3, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' } : {}),`,
  )
  // 发光被裁：给列表左右留白
  t = t.replace(
    `padding: '0 4px 6px'`,
    `padding: '10px 16px 12px'`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 位移/发光留白')
}

// 4) StatusRail: 最近区也带位移 + 抬起阴影
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `                      style={{
                        ...(dragging ? { transform: \`translateY(\${recentDrag.offsetY}px)\`, zIndex: 3 } : {}),
                        touchAction: 'none',
                      }}`,
    `                      style={{
                        transform: \`translateY(\${dragging ? recentDrag.offsetY : recentDrag.shiftOf(entry.cardId)}px)\`,
                        transition: dragging ? 'none' : 'transform 120ms ease',
                        touchAction: 'none',
                        ...(dragging ? { zIndex: 3, filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.5))' } : {}),
                      }}`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 最近区位移')
}
