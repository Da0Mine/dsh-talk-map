import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 列表 ref + 触底加载
if (!t.includes('listRef')) {
  t = t.replace(
    `  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE_SIZE)`,
    `  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE_SIZE)
  const listRef = useRef<HTMLDivElement | null>(null)
  const moreRef = useRef({ hasMore: false, loadMore: () => {} })`,
  )
  t = t.replace(
    `  const visibleRecentRows = unpinnedRecentRows.slice(0, recentLimit)`,
    `  const visibleRecentRows = unpinnedRecentRows.slice(0, recentLimit)`,
  )
  t = t.replace(
    `  const hasMoreRecent = unpinnedRecentRows.length > visibleRecentRows.length`,
    `  const hasMoreRecent = unpinnedRecentRows.length > visibleRecentRows.length
  moreRef.current = {
    hasMore: hasMoreRecent,
    loadMore: () => { setRecentLimit(current => current + RECENT_PAGE_SIZE) },
  }`,
  )
}

// 2) 列表容器挂 ref
t = t.replace(
  `        className={styles['sidebarQueueList']}`,
  `        ref={listRef}
        className={styles['sidebarQueueList']}`,
)

// 3) wheel 监听（触底再滚一次 → +5）
if (!t.includes("addEventListener('wheel'")) {
  t = t.replace(
    `  const activeSession = currentSessionId()`,
    `  // Same pager as the map rail: at the bottom, one more wheel tick loads five more.
  useEffect(() => {
    const list = listRef.current
    if (list === null) return
    const onWheel = (event: WheelEvent): void => {
      if (event.deltaY <= 0) return
      const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 2
      if (!atBottom || !moreRef.current.hasMore) return
      event.preventDefault()
      moreRef.current.loadMore()
    }
    list.addEventListener('wheel', onWheel, { passive: false })
    return () => { list.removeEventListener('wheel', onWheel) }
  }, [])

  const activeSession = currentSessionId()`,
  )
}
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: ref + 触底加载')
