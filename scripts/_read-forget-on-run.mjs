import fs from 'node:fs'
const f = 'src/client/session-activity.ts'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('readArchive.forget(sessionId)')) {
  t = t.replace(
    `      const onScreen = (row?.retainedBy?.mainView ?? 0) > 0`,
    `      // Back to 任务中: it leaves「最近的任务」and the next completion must be read again.
      if (running === true) readArchive.forget(sessionId)
      const onScreen = (row?.retainedBy?.mainView ?? 0) > 0`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('session-activity: 重新运行时移出最近区')
}
