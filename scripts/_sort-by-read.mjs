import fs from 'node:fs'

// MapCanvas：最近区按"最后看完时间"排序
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './read-archive.ts'")) {
    t = t.replace(/^import /m, `import { readArchive } from './read-archive.ts'\nimport `)
  }
  t = t.replace(
    `  const finishHistory = useSyncExternalStore(sessionActivity.subscribe, () => sessionActivity.history())`,
    `  const finishHistory = useSyncExternalStore(sessionActivity.subscribe, () => sessionActivity.history())
  const readMarks = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())`,
  )
  t = t.replace(
    `    // Newest completion first: updatedAt stops moving once the 待查看 is read.
    rows.sort((a, b) => (finishHistory.get(b.sessionId) ?? 0) - (finishHistory.get(a.sessionId) ?? 0))`,
    `    // Newest READ first: finishing order says nothing about which one you actually looked at
    // last, and that is what decides the order here.
    const seenAt = (sessionId: string): number => readMarks.get(sessionId) ?? finishHistory.get(sessionId) ?? 0
    rows.sort((a, b) => seenAt(b.sessionId) - seenAt(a.sessionId))`,
  )
  t = t.replace(
    `  }, [visibleCards, sessions, statusEntries, renamedTitles, previews, finishHistory])`,
    `  }, [visibleCards, sessions, statusEntries, renamedTitles, previews, finishHistory, readMarks])`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 最近区按最后看完排序')
}

// SidebarQueue：同样
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './read-archive.ts'")) {
    t = t.replace(/^import /m, `import { readArchive } from './read-archive.ts'\nimport `)
  }
  t = t.replace(
    `  const finishHistory = useSyncExternalStore(sessionActivity.subscribe, () => sessionActivity.history())`,
    `  const finishHistory = useSyncExternalStore(sessionActivity.subscribe, () => sessionActivity.history())
  const readMarks = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())`,
  )
  t = t.replace(
    `      out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))`,
    `      // Whoever was read last sits on top.
      const seenAt = (sessionId: string): number => readMarks.get(sessionId) ?? finishHistory.get(sessionId) ?? 0
      out.sort((a, b) => seenAt(b.sessionId) - seenAt(a.sessionId))`,
  )
  t = t.replace(
    `  }, [rows, sessions, archivedSessionIds, finishHistory])`,
    `  }, [rows, sessions, archivedSessionIds, finishHistory, readMarks])`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 最近区按最后看完排序')
}
