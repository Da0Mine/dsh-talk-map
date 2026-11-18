import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')

// 1) 本地"刚点开过"的集合
t = t.replace(
  `  const drag = useRef<{ startY: number; startHeight: number } | null>(null)`,
  `  const drag = useRef<{ startY: number; startHeight: number } | null>(null)
  // Sessions the user just opened from here. The Host clears "unread" only after the shell
  // reports the session as the main view, so without this the card lingers for a while.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set())`,
)

// 2) 行过滤：已点开且只剩 done 的卡不再显示
t = t.replace(
  `      const lamp = lampOf(card.sessionId, statusById.get(card.sessionId), summary, alerts, finished)
      if (lamp === undefined) continue`,
  `      const lamp = lampOf(card.sessionId, statusById.get(card.sessionId), summary, alerts, finished)
      if (lamp === undefined) continue
      // Opened from here already: stop showing the "done, unread" card, it is read now.
      if (lamp === 'done' && opened.has(card.sessionId)) continue`,
)
t = t.replace(
  '  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts])',
  '  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened])',
)

// 3) 一旦宿主的判定不再说 done，就把该 id 从 opened 里移除，避免长期挂着
t = t.replace(
  `  // Only lamped cards, exactly like the rail.`,
  `  useEffect(() => {
    if (opened.size === 0) return
    const stale = [...opened].filter((sessionId) => {
      const summary = sessions.byId[sessionId]
      const lamp = lampOf(sessionId, statusById.get(sessionId), summary, alerts, finished)
      return lamp !== 'done'
    })
    if (stale.length === 0) return
    setOpened((current) => {
      const next = new Set(current)
      for (const id of stale) next.delete(id)
      return next
    })
  }, [opened, sessions, statusById, alerts, finished])

  // Only lamped cards, exactly like the rail.`,
)

// 4) 点击/回车时记入 opened
t = t.replace(
  `                sessionActivity.forget(row.sessionId)
                closeMapPanel()
                openSessionInUi(row.sessionId)`,
  `                sessionActivity.forget(row.sessionId)
                setOpened((current) => new Set(current).add(row.sessionId))
                closeMapPanel()
                openSessionInUi(row.sessionId)`,
)
t = t.replace(
  `                event.preventDefault()
                sessionActivity.forget(row.sessionId)
                closeMapPanel()
                openSessionInUi(row.sessionId)`,
  `                event.preventDefault()
                sessionActivity.forget(row.sessionId)
                setOpened((current) => new Set(current).add(row.sessionId))
                closeMapPanel()
                openSessionInUi(row.sessionId)`,
)
fs.writeFileSync(file, t, 'utf8')
console.log('optimistic read: opened set wired')
