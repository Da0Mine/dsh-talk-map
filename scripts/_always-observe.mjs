import fs from 'node:fs'

// 1) session-activity：observe 增加 onlyBackground 选项（跳过"你正看着的那个会话"）
{
  const f = 'src/client/session-activity.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  observe(
    status: ReadonlyMap<string, SessionStatusFact>,
    summaries: Readonly<Record<string, SummaryLike>>,
  ): void {`,
    `  observe(
    status: ReadonlyMap<string, SessionStatusFact>,
    summaries: Readonly<Record<string, SummaryLike>>,
    options?: { onlyBackground?: boolean },
  ): void {`,
  )
  t = t.replace(
    `      if (wasRunning === true && !finished.has(sessionId)) {
        finished.add(sessionId)
        markedEpoch.set(sessionId, panelEpoch)
        changed = true
      }`,
    `      // A turn that ends while you are looking at that very conversation needs no lamp; the
      // always-on observer (the sidebar queue) passes onlyBackground so it never marks it.
      const onScreen = (row?.retainedBy?.mainView ?? 0) > 0
      if (wasRunning === true && !finished.has(sessionId) && !(options?.onlyBackground === true && onScreen)) {
        finished.add(sessionId)
        markedEpoch.set(sessionId, panelEpoch)
        changed = true
      }`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('session-activity: onlyBackground 选项')
}

// 2) SidebarQueue：常驻观察，地图关着也能记灯
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const anchor = `  useEffect(() => {
    for (const sessionId of finished) {`
  if (!t.includes(anchor)) throw new Error('finished effect anchor missing')
  t = t.replace(anchor, `  // The queue board lives in the sidebar and is therefore always mounted: observing the status
  // store here is what gives a conversation finished while the map is closed its 待查看 lamp.
  useEffect(() => {
    sessionActivity.observe(statusById, sessions.byId, { onlyBackground: true })
  }, [statusById, sessions])

  useEffect(() => {
    for (const sessionId of finished) {`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 常驻 observe')
}
