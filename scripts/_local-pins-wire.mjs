import fs from 'node:fs'

// StatusRail：本地置顶并入排序与菜单
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './pins.ts'")) {
    t = t.replace(`import { useReorder } from './reorder.ts'`,
      `import { isPinnedSession, localPins } from './pins.ts'\nimport { useReorder } from './reorder.ts'`)
  }
  // 订阅本地置顶
  t = t.replace(
    `  const [menu, setMenu] = useState<RailMenuTarget | null>(null)`,
    `  const [menu, setMenu] = useState<RailMenuTarget | null>(null)
  const localPinSet = useSyncExternalStore(localPins.subscribe, () => localPins.get())`,
  )
  // 排序时并入
  t = t.replace(
    `      return sortQueueRows(props.entries.map(entry => ({
        ...entry,
        manualIndex: manualIndex(entry.cardId),
      })))`,
    `      return sortQueueRows(props.entries.map(entry => ({
        ...entry,
        manualIndex: manualIndex(entry.cardId),
        ...(isPinnedSession(localPinSet, entry.sessionId) ? { pinned: true } : {}),
      })))`,
  )
  t = t.replace(`    }, [order, props.entries])`, `    }, [order, props.entries, localPinSet])`)
  // 菜单里的置顶状态
  t = t.replace(
    `          pinned: props.pinned?.has(entry.sessionId) === true,`,
    `          pinned: isPinnedSession(localPinSet, entry.sessionId) || props.pinned?.has(entry.sessionId) === true,`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 本地置顶并入')
}

// SidebarQueue：同样并入
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("from './pins.ts'")) {
    t = t.replace(`import { useReorder } from './reorder.ts'`,
      `import { isPinnedSession, localPins } from './pins.ts'\nimport { useReorder } from './reorder.ts'`)
  }
  t = t.replace(
    `  const [menu, setMenu] = useState<RailMenuTarget | null>(null)`,
    `  const [menu, setMenu] = useState<RailMenuTarget | null>(null)
  const localPinSet = useSyncExternalStore(localPins.subscribe, () => localPins.get())`,
  )
  t = t.replace(
    `        ...(pinnedSessions.has(sessionId) ? { pinned: true } : {}),`,
    `        ...(isPinnedSession(localPinSet, sessionId) ? { pinned: true } : {}),`,
  )
  t = t.replace(
    `  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds, queueOrder, pinnedSessions])`,
    `  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds, queueOrder, pinnedSessions, localPinSet])`,
  )
  // 桶排序也要看本地置顶
  t = t.replace(
    `    return row === undefined ? 0 : queueRank(row.lamp, row.draft === true, pinnedSessions.has(sessionId))`,
    `    return row === undefined ? 0 : queueRank(row.lamp, row.draft === true, isPinnedSession(localPinSet, sessionId))`,
  )
  t = t.replace(`  }, [rows, pinnedSessions])`, `  }, [rows, pinnedSessions, localPinSet])`)
  // 菜单置顶状态
  t = t.replace(/pinned: pinnedSessions\.has\(row\.sessionId\),/g,
    `pinned: isPinnedSession(localPinSet, row.sessionId) || pinnedSessions.has(row.sessionId),`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 本地置顶并入')
}
