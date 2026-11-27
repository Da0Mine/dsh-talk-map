import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')

// 状态：可见条数
t = t.replace(
  `  const [recentOrder, setRecentOrder] = useState<string[]>([])`,
  `  const [recentOrder, setRecentOrder] = useState<string[]>([])
  /** How many recent tasks are on screen; +RECENT_PAGE_SIZE per 「查看更多」/ bottom wheel. */
  const [recentLimit, setRecentLimit] = useState(RECENT_PAGE_SIZE)`,
)

// 需要分页的列表 + 是否还有更多
t = t.replace(
  `  const pinnedRecentEntries = recentEntriesOrdered.filter(entry => isPinnedSession(localPinSet, entry.sessionId))`,
  `  const pinnedRecentEntries = recentEntriesOrdered.filter(entry => isPinnedSession(localPinSet, entry.sessionId))`,
)
t = t.replace(
  `  const recentRenderedIds = recentEntriesOrdered.map(entry => entry.cardId)`,
  `  const visibleRecentEntries = unpinnedRecentEntries.slice(0, recentLimit)
  const hasMoreRecent = unpinnedRecentEntries.length > visibleRecentEntries.length
  const recentRenderedIds = recentEntriesOrdered.map(entry => entry.cardId)`,
)

// 渲染用可见列表
t = t.replace(`                {unpinnedRecentEntries.map(entry => {`, `                {visibleRecentEntries.map(entry => {`)
t = t.replace(
  `          {props.recent !== undefined && unpinnedRecentEntries.length > 0`,
  `          {visibleRecentEntries.length > 0`,
)

// 「查看更多」按钮
t = t.replace(
  `        </div>
      </div>
      <div className={styles['statusRailTabWrap']}`,
  `          {hasMoreRecent
            ? (
                <button
                  type="button"
                  className={styles['statusRailMore']}
                  onClick={() => { setRecentLimit(current => current + RECENT_PAGE_SIZE) }}
                >
                  {t('statusRail.more')}
                </button>
              )
            : null}
        </div>
      </div>
      <div className={styles['statusRailTabWrap']}`,
)

// 触底再滚一次 → 加载更多
t = t.replace(
  `  const panelRef = useRef<HTMLDivElement | null>(null)`,
  `  const panelRef = useRef<HTMLDivElement | null>(null)
  const moreRef = useRef({ hasMore: false, loadMore: () => {} })`,
)
t = t.replace(
  `  const [drag, setDrag] = useState<DragState | null>(null)`,
  `  moreRef.current = {
    hasMore: hasMoreRecent,
    loadMore: () => { setRecentLimit(current => current + RECENT_PAGE_SIZE) },
  }

  const [drag, setDrag] = useState<DragState | null>(null)`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('StatusRail: 分页 + 按钮')
