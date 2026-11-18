import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')

// 1) 直接订阅宿主 uiSession.sessionStatus —— 与地图侧栏 glowOf 同源
t = t.replace(
  "const EMPTY_SESSIONS: SessionListState = { ids: [], byId: {} }",
  `const EMPTY_SESSIONS: SessionListState = { ids: [], byId: {} }
const EMPTY_STATUS: ReadonlyMap<string, SessionStatusFact> = new Map()`,
)
t = t.replace(
  "const emptySnapshot = (): SessionListState => EMPTY_SESSIONS",
  `const emptySnapshot = (): SessionListState => EMPTY_SESSIONS
const emptyStatus = (): ReadonlyMap<string, SessionStatusFact> => EMPTY_STATUS`,
)
t = t.replace(
  "import type { SessionListState, SessionSummary } from './dsh.ts'",
  "import type { SessionListState, SessionStatusFact, SessionSummary } from './dsh.ts'",
)

// 2) lampOf 换成与 glowOf 完全一致的三条判定（status 事实优先）
t = t.replace(
  `function lampOf(
  sessionId: string,
  summary: SessionSummary | undefined,
  alerts: ReadonlySet<string>,
  finished: ReadonlyMap<string, unknown>,
): CardGlow | undefined {
  if (alerts.has(sessionId)) return 'error'
  if (summary?.pendingInteraction !== undefined) return 'waiting'
  if (summary?.running === true) return 'running'
  if (summary?.completed === true || finished.has(sessionId)) return 'done'
  return undefined
}`,
  `/**
 * The rail's lamp rules, verbatim. \`status\` is the same uiSession.sessionStatus snapshot the
 * map panel reads through its \`useSessionStatus\` prop, so both rails agree — deriving "done"
 * from the session summary instead made this side miss "waiting to be read" cards.
 */
function lampOf(
  sessionId: string,
  status: SessionStatusFact | undefined,
  summary: SessionSummary | undefined,
  alerts: ReadonlySet<string>,
  finished: ReadonlyMap<string, unknown>,
): CardGlow | undefined {
  if (alerts.has(sessionId)) return 'error'
  if (status?.pendingInteraction !== undefined) return 'waiting'
  if (status?.running === true || summary?.running === true) return 'running'
  if (status?.completionUnread === true || finished.has(sessionId)) return 'done'
  return undefined
}`,
)

// 3) 订阅 status store
t = t.replace(
  `  const alerts = useSyncExternalStore(sessionAlerts.subscribe, sessionAlerts.getSnapshot)`,
  `  // uiSession.sessionStatus: the exact store behind the panel's useSessionStatus hook.
  const statusStore = (services?.ctx?.get?.('uiSession') as
    { sessionStatus?: { getSnapshot(): ReadonlyMap<string, SessionStatusFact>; subscribe(l: () => void): () => void } } | undefined)?.sessionStatus
  const statusById = useSyncExternalStore(
    statusStore === undefined ? NO_SUBSCRIBE : (listener) => statusStore.subscribe(listener),
    statusStore === undefined ? emptyStatus : () => statusStore.getSnapshot(),
  )
  const alerts = useSyncExternalStore(sessionAlerts.subscribe, sessionAlerts.getSnapshot)`,
)

// 4) 传参 + 依赖
t = t.replace(
  "      const lamp = lampOf(card.sessionId, summary, alerts, finished)",
  "      const lamp = lampOf(card.sessionId, statusById.get(card.sessionId), summary, alerts, finished)",
)
t = t.replace(
  "  }, [canvasState.cards, sessions, alerts, finished, drafts])",
  "  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts])",
)
fs.writeFileSync(file, t, 'utf8')
console.log('SidebarQueue now reads uiSession.sessionStatus')
