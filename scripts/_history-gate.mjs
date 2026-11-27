import fs from 'node:fs'

// MapCanvas：最近区改用 history（持久化），并按完成时间倒序
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  const readFinished = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())`,
    `  const finishHistory = useSyncExternalStore(sessionActivity.subscribe, () => sessionActivity.history())`,
  )
  t = t.replace(
    `        if (!readFinished.has(card.sessionId)) continue`,
    `        if (!finishHistory.has(card.sessionId)) continue`,
  )
  t = t.replace(`  }, [visibleCards, glowOf, draftTexts, sessions, renamedTitles, readFinished])`,
    `  }, [visibleCards, glowOf, draftTexts, sessions, renamedTitles, finishHistory])`)
  // 排序：历史完成时间倒序（原来用 updatedAt，已读后没有再更新）
  t = t.replace(
    `    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))`,
    `    out.sort((a, b) => (finishHistory.get(b.sessionId) ?? 0) - (finishHistory.get(a.sessionId) ?? 0))`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 最近区用 history')
}

// SidebarQueue：同样
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  const readFinished = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())`,
    `  const finishHistory = useSyncExternalStore(sessionActivity.subscribe, () => sessionActivity.history())`,
  )
  t = t.replace(`        if (!readFinished.has(sessionId)) continue`, `        if (!finishHistory.has(sessionId)) continue`)
  t = t.replace(`  }, [rows, sessions, archivedSessionIds, readFinished])`, `  }, [rows, sessions, archivedSessionIds, finishHistory])`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 最近区用 history')
}
