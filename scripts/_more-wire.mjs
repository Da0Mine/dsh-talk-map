import fs from 'node:fs'

// StatusRail：面板触底再滚一次 → 加载更多
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("addEventListener('wheel'")) {
    t = t.replace(
      `  const orderRef = useRef(order)`,
      `  // Wheel at the very bottom is the second way to page (the button is the first).
  useEffect(() => {
    const panel = panelRef.current
    if (panel === null) return
    const onWheel = (event: WheelEvent): void => {
      if (event.deltaY <= 0) return
      const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2
      if (!atBottom || !moreRef.current.hasMore) return
      event.preventDefault()
      moreRef.current.loadMore()
    }
    panel.addEventListener('wheel', onWheel, { passive: false })
    return () => { panel.removeEventListener('wheel', onWheel) }
  }, [open])

  const orderRef = useRef(order)`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('StatusRail: 触底加载')
  }
}

// CSS
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('.statusRailMore')) {
    t += `
/* 「查看更多」: the second half of the recent-tasks pager (scrolling at the bottom is the first). */
.statusRailMore {
  margin: 2px 2px 6px;
  padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.14));
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.7));
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}

.statusRailMore:hover {
  color: var(--dsw-alias-label-primary, #fff);
  border-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.24));
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: statusRailMore')
  }
}

// i18n
{
  const f = 'src/client/i18n.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("'statusRail.more'")) {
    t = t.replace(
      /(\s*)'statusRail\.recent': '最近的任务',/,
      `$1'statusRail.recent': '最近的任务',$1'statusRail.more': '查看更多',`,
    )
    t = t.replace(/(\s*)'statusRail\.recent': 'Recent tasks',/, `$1'statusRail.recent': 'Recent tasks',$1'statusRail.more': 'Show more',`)
    fs.writeFileSync(f, t, 'utf8')
    console.log('i18n: statusRail.more')
  }
}
