import fs from 'node:fs'
const f = 'src/client/session-activity.ts'
let t = fs.readFileSync(f, 'utf8')
// 完成就写历史：无论是否给灯（"你正看着的那个会话"不给灯，但一样算完成过）
t = t.replace(
  `      const onScreen = (row?.retainedBy?.mainView ?? 0) > 0
      if (wasRunning === true && !finished.has(sessionId) && !(options?.onlyBackground === true && onScreen)) {`,
  `      const onScreen = (row?.retainedBy?.mainView ?? 0) > 0
      // Completion history is unconditional: a turn that ends in the conversation you are looking
      // at gets no lamp (you already saw it), but it is still a finished task and belongs in
      // 「最近的任务」instead of vanishing from every list.
      if (wasRunning === true && !history.has(sessionId)) {
        history.set(sessionId, Date.now())
        changed = true
      }
      if (wasRunning === true && !finished.has(sessionId) && !(options?.onlyBackground === true && onScreen)) {`,
)
// 之前标记完成时的那次写入现在是冗余的，保留无害但去掉更清晰
t = t.replace(
  `        markedEpoch.set(sessionId, panelEpoch)
        if (!history.has(sessionId)) history.set(sessionId, Date.now())
        changed = true`,
  `        markedEpoch.set(sessionId, panelEpoch)
        changed = true`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('session-activity: 完成即写历史（含不给灯的路径）')
