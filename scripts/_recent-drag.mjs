import fs from 'node:fs'

// ================= StatusRail =================
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')

  t = t.replace(
    `import { relativeTime, LAMP_CHIP, type CardGlow } from './SessionCard.tsx'`,
    `import { relativeTime, LAMP_CHIP, type CardGlow, type CardLamp } from './SessionCard.tsx'`,
  ).replace(
    `import { relativeTime, LAMP_CHIP, type CardGlow } from './SessionCard.tsx'\r`,
    `import { relativeTime, LAMP_CHIP, type CardGlow, type CardLamp } from './SessionCard.tsx'\r`,
  )

  // renderCard: 允许外部接管 pointerdown（最近区的拖拽排序）
  t = t.replace(
    `  const renderCard = (entry: StatusRailEntry, floating: boolean, interactive = true): React.JSX.Element => (`,
    `  const renderCard = (
    entry: StatusRailEntry,
    floating: boolean,
    interactive = true,
    pointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void,
  ): React.JSX.Element => (`,
  )
  t = t.replace(
    `      onPointerDown={floating || !interactive ? undefined : (event) => { beginDrag(event, entry.cardId) }}`,
    `      onPointerDown={floating || !interactive ? pointerDown : (event) => { beginDrag(event, entry.cardId) }}`,
  )

  // 最近区：加顺序状态 + 拖拽
  t = t.replace(
    `  const [order, setOrder] = useState<string[]>(() => readOrder())`,
    `  const [order, setOrder] = useState<string[]>(() => readOrder())
  /** Order of the「最近的任务」strip; independent from the queue's own order. */
  const [recentOrder, setRecentOrder] = useState<string[]>([])
  const recentIds = (props.recent ?? []).map(entry => entry.cardId)
  useEffect(() => {
    setRecentOrder(current => {
      const kept = current.filter(id => recentIds.includes(id))
      const added = recentIds.filter(id => !kept.includes(id))
      const next = [...kept, ...added]
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentIds.join('|')])
  const recentDrag = useReorder(recentIds, setRecentOrder)
  const recentEntriesOrdered = useMemo(() => {
    const byId = new Map((props.recent ?? []).map(entry => [entry.cardId, entry]))
    const ordered = recentOrder.map(id => byId.get(id)).filter((entry): entry is StatusRailEntry => entry !== undefined)
    // Anything the sync effect has not seen yet still shows up, at the end.
    for (const entry of props.recent ?? []) {
      if (!recentOrder.includes(entry.cardId)) ordered.push(entry)
    }
    return ordered
  }, [props.recent, recentOrder])`,
  )

  // 最近区渲染改成拖拽版本
  t = t.replace(
    `              <>
                <div className={styles['statusRailRecentHead']}>{t('statusRail.recent')}</div>
                {props.recent.map(entry => (
                  <div key={entry.cardId} className={styles['statusRailSlot']}>
                    {renderCard(entry, false, false)}
                  </div>
                ))}
              </>`,
    `              <>
                <div className={styles['statusRailRecentHead']}>{t('statusRail.recent')}</div>
                {recentEntriesOrdered.map(entry => {
                  const dragging = recentDrag.draggingId === entry.cardId
                  return (
                    <div
                      key={entry.cardId}
                      ref={element => { recentDrag.register(entry.cardId, element) }}
                      className={styles['statusRailSlot']}
                      style={{
                        ...(dragging ? { transform: \`translateY(\${recentDrag.offsetY}px)\`, zIndex: 3 } : {}),
                        touchAction: 'none',
                      }}
                    >
                      {renderCard(entry, false, true, event => { recentDrag.begin(event, entry.cardId) })}
                    </div>
                  )
                })}
              </>`,
  )

  t = t.replace(
    `import { relativeTime, LAMP_CHIP, type CardGlow } from './SessionCard.tsx'`,
    `import { useReorder } from './reorder.ts'\nimport { relativeTime, LAMP_CHIP, type CardGlow } from './SessionCard.tsx'`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 最近区可拖拽')
}
