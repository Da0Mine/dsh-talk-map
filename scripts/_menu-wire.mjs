import fs from 'node:fs'

// ---------- StatusRail ----------
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')

  t = t.replace(`import { useReorder } from './reorder.ts'`,
    `import { useReorder } from './reorder.ts'\nimport { RailCardMenu, type RailMenuTarget } from './rail-menu.tsx'`)

  // pinned prop
  t = t.replace(
    `  /** The conversation on screen right now: it gets the corner brackets. */
  currentSessionId?: string`,
    `  /** The conversation on screen right now: it gets the corner brackets. */
  currentSessionId?: string
  /** Pinned sessions, so the card menu can show 置顶 / 取消置顶. */
  pinned?: ReadonlySet<string>`,
  )

  // menu state
  t = t.replace(
    `  const [recentOrder, setRecentOrder] = useState<string[]>([])`,
    `  const [recentOrder, setRecentOrder] = useState<string[]>([])
  const [menu, setMenu] = useState<RailMenuTarget | null>(null)`,
  )

  // contextmenu on cards
  t = t.replace(
    `      {...(interactive ? {} : { onClick: () => { props.onOpen(entry.cardId) } })}`,
    `      {...(interactive ? {} : { onClick: () => { props.onOpen(entry.cardId) } })}
      onContextMenu={(event) => {
        event.preventDefault()
        setMenu({
          sessionId: entry.sessionId,
          title: entry.title,
          pinned: props.pinned?.has(entry.sessionId) === true,
          x: event.clientX,
          y: event.clientY,
        })
      }}`,
  )

  // 最近卡：interactive 必须是 false，pointerdown 才用得到自定义处理器
  t = t.replace(
    `                      {renderCard(entry, false, true, event => { recentDrag.begin(event, entry.cardId) })}`,
    `                      {renderCard(entry, false, false, event => { recentDrag.begin(event, entry.cardId) })}`,
  )

  // 渲染菜单
  t = t.replace(
    `      <button
        type="button"
        ref={tabRef}`,
    `      {menu !== null
        ? <RailCardMenu target={menu} onClose={() => { setMenu(null) }} />
        : null}
      <button
        type="button"
        ref={tabRef}`,
  )

  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 右键菜单 + 修正最近卡 pointerdown')
}

// ---------- SidebarQueue ----------
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')

  t = t.replace(`import { useReorder } from './reorder.ts'`,
    `import { useReorder } from './reorder.ts'\nimport { RailCardMenu, type RailMenuTarget } from './rail-menu.tsx'`)

  t = t.replace(
    `  const [recentOrder, setRecentOrder] = useState<string[]>([])`,
    `  const [recentOrder, setRecentOrder] = useState<string[]>([])
  const [menu, setMenu] = useState<RailMenuTarget | null>(null)`,
  )

  // 主行：瞄准镜 + 右键
  t = t.replace(
    `              className={\`\${styles['card']} \${row.lamp === undefined ? '' : styles[LAMP_CLASS[row.lamp]] ?? ''} \${styles['statusRailCard']} \${styles['sidebarQueueCard']}\`}`,
    `              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({
                  sessionId: row.sessionId,
                  title: row.title,
                  pinned: pinnedSessions.has(row.sessionId),
                  x: event.clientX,
                  y: event.clientY,
                })
              }}
              className={\`\${styles['card']} \${row.lamp === undefined ? '' : styles[LAMP_CLASS[row.lamp]] ?? ''} \${styles['statusRailCard']} \${styles['sidebarQueueCard']}\`}`,
  )
  t = t.replace(
    `              data-talkmap-queue={row.sessionId}`,
    `              data-talkmap-queue={row.sessionId}`,
  )

  // 主行内容里插入 reticle（在 cardTop 之前）
  t = t.replace(
    `                <span className={styles['cardTitle']}>{row.title}</span>
              </div>`,
    `                <span className={styles['cardTitle']}>{row.title}</span>
              </div>`,
  )

  // 最近行也加右键
  t = t.replace(
    `                  data-talkmap-queue-recent={row.sessionId}`,
    `                  data-talkmap-queue-recent={row.sessionId}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setMenu({
                      sessionId: row.sessionId,
                      title: row.title,
                      pinned: pinnedSessions.has(row.sessionId),
                      x: event.clientX,
                      y: event.clientY,
                    })
                  }}`,
  )

  // 菜单渲染
  t = t.replace(
    `      <div className={styles['sidebarQueueHead']}>`,
    `      {menu !== null
        ? <RailCardMenu target={menu} onClose={() => { setMenu(null) }} />
        : null}
      <div className={styles['sidebarQueueHead']}>`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 右键菜单')
}
