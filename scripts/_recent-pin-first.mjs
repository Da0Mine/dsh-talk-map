import fs from 'node:fs'

// StatusRail：最近区里置顶排前
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `    for (const entry of props.recent ?? []) {
      if (!recentOrder.includes(entry.cardId)) ordered.push(entry)
    }
    return ordered`,
    `    for (const entry of props.recent ?? []) {
      if (!recentOrder.includes(entry.cardId)) ordered.push(entry)
    }
    // Pinned first inside the strip, manual order preserved within each group.
    const pinnedFirst = ordered.filter(entry => isPinnedSession(localPinSet, entry.sessionId))
    const rest = ordered.filter(entry => !isPinnedSession(localPinSet, entry.sessionId))
    return [...pinnedFirst, ...rest]`,
  )
  t = t.replace(`  }, [props.recent, recentOrder])`, `  }, [props.recent, recentOrder, localPinSet])`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 最近区置顶排前')
}

// SidebarQueue：同样
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `    for (const row of recentRows) if (!recentOrder.includes(row.sessionId)) ordered.push(row)
    return ordered`,
    `    for (const row of recentRows) if (!recentOrder.includes(row.sessionId)) ordered.push(row)
    const pinnedFirst = ordered.filter(row => isPinnedSession(localPinSet, row.sessionId))
    const rest = ordered.filter(row => !isPinnedSession(localPinSet, row.sessionId))
    return [...pinnedFirst, ...rest]`,
  )
  t = t.replace(`  }, [recentRows, recentOrder])`, `  }, [recentRows, recentOrder, localPinSet])`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 最近区置顶排前')
}
