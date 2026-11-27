import fs from 'node:fs'
const f = 'src/client/session-activity.ts'
let t = fs.readFileSync(f, 'utf8')

// 1) history 集合
if (!t.includes('const history =')) {
  t = t.replace(
    `const finished = new Set<string>()`,
    `const finished = new Set<string>()
/** sessionId → when it finished for the first time. Outlives the 待查看 lamp (「最近的任务」). */
const history = new Map<string, number>()
let historySnapshot: ReadonlyMap<string, number> = new Map()`,
  )
}

// 2) publish 里更新快照
t = t.replace(
  `  snapshot = new Set(finished)`,
  `  snapshot = new Set(finished)
  historySnapshot = new Map(history)`,
)

// 3) persist 带上 history
t = t.replace(
  `  saveLampState({ finished: finishedRecord, interrupted: interruptedRecord })`,
  `  saveLampState({ finished: finishedRecord, interrupted: interruptedRecord, history: Object.fromEntries(history) })`,
)

// 4) hydrate 还原 history
t = t.replace(
  `  for (const sessionId of Object.keys(stored.interrupted)) {`,
  `  for (const [sessionId, at] of Object.entries(stored.history ?? {})) history.set(sessionId, at)
  for (const sessionId of Object.keys(stored.interrupted)) {`,
)

// 5) 标记完成时写入 history
t = t.replace(
  `        finished.add(sessionId)
        markedEpoch.set(sessionId, panelEpoch)
        changed = true`,
  `        finished.add(sessionId)
        markedEpoch.set(sessionId, panelEpoch)
        if (!history.has(sessionId)) history.set(sessionId, Date.now())
        changed = true`,
)

// 6) 对外暴露 history
t = t.replace(
  `  getSnapshot(): ReadonlySet<string> {
    return snapshot
  },`,
  `  getSnapshot(): ReadonlySet<string> {
    return snapshot
  },
  /** Every session that has finished at least once (persisted): the feed for「最近的任务」. */
  history(): ReadonlyMap<string, number> {
    return historySnapshot
  },`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('session-activity: history 记录与暴露')
