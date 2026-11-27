import fs from 'node:fs'

// 1) session-activity：看过/丢弃灯时记入 readArchive
{
  const f = 'src/client/session-activity.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './read-archive.ts'")) {
    t = t.replace(/^import /m, `import { readArchive } from './read-archive.ts'\nimport `)
  }
  // acknowledge：用户点了这张卡 → 看过
  t = t.replace(
    `  acknowledge(sessionId: string): void {`,
    `  acknowledge(sessionId: string): void {
    readArchive.mark(sessionId)`,
  )
  // forget：正在完成的灯被撤掉（= 已查看）
  t = t.replace(
    `  forget(sessionId: string): void {`,
    `  forget(sessionId: string): void {
    if (finished.has(sessionId)) readArchive.mark(sessionId)`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('session-activity: 记录已查看')
}

// 2) MapCanvas：最近区必须以"看完过"为前提
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './read-archive.ts'")) {
    t = t.replace(/^import /m, `import { readArchive } from './read-archive.ts'\nimport `)
  }
  t = t.replace(
    `  const recentEntries = useMemo<StatusRailEntry[]>(() => {`,
    `  const readFinished = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())
  const recentEntries = useMemo<StatusRailEntry[]>(() => {`,
  )
  // 过滤条件：必须在"已查看"集合里
  t = t.replace(
    `      if (lamp !== undefined) continue`,
    `      if (lamp !== undefined) continue
      // 「最近的任务」= 完成 → 待查看 → 看过：没走完这条链的不入列。
      if (!readFinished.has(card.sessionId)) continue`,
  )
  t = t.replace(
    `  }, [visibleCards, glowOf, draftTexts, sessions, renamedTitles])`,
    `  }, [visibleCards, glowOf, draftTexts, sessions, renamedTitles, readFinished])`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 最近区要求已查看')
}
