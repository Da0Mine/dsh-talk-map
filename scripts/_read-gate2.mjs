import fs from 'node:fs'

// MapCanvas：在 recentEntries 循环里加"已查看"门槛
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const anchor = `        if (listed.has(card.sessionId)) continue`
  if (!t.includes(anchor)) throw new Error('recentEntries loop anchor missing')
  if (!t.slice(t.indexOf(anchor), t.indexOf(anchor) + 400).includes('readFinished.has')) {
    t = t.replace(
      anchor,
      `${anchor}
        // 「最近的任务」= 任务中 → 待查看 → 看过；没走完这条链的不入列。
        if (!readFinished.has(card.sessionId)) continue`,
    )
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: recentEntries 门槛已加')
}

// SidebarQueue：recentRows 同样门槛
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './read-archive.ts'")) {
    t = t.replace(/^import /m, `import { readArchive } from './read-archive.ts'\nimport `)
  }
  t = t.replace(
    `  const recentRows = useMemo(() => {`,
    `  const readFinished = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())
  const recentRows = useMemo(() => {`,
  )
  t = t.replace(
    `        if (listed.has(sessionId)) continue`,
    `        if (listed.has(sessionId)) continue
        // 只有"待查看且已看过"的会话才落到最近的任务。
        if (!readFinished.has(sessionId)) continue`,
  )
  t = t.replace(
    `  }, [rows, sessions, archivedSessionIds])`,
    `  }, [rows, sessions, archivedSessionIds, readFinished])`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: recentRows 门槛已加')
}
