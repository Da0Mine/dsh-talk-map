/** Rail: a "current task" block at the top that jumps back to the conversation you are in. */
import fs from 'node:fs'

const edits = []

// ── 1. props: the current conversation ─────────────────────────────────────
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    `  /** Single click: open that conversation. */
  onOpen: (cardId: string) => void
}`,
    `  /** Single click: open that conversation. */
  onOpen: (cardId: string) => void
  /** The conversation the map was opened from — the rail's "current task" block. */
  current?: StatusRailCurrent
}

export interface StatusRailCurrent {
  cardId: string
  title: string
  /** Only when it also carries a lamp (running / waiting / unread). */
  lamp?: StatusLamp
  preview?: string
  updatedAt?: number
}`,
  )

  // ── 2. render the block above the list ────────────────────────────────────
  text = text.replace(
    `        <div className={styles['statusRailList']} role="list">`,
    `        {props.current !== undefined
          ? (
            <div className={styles['statusRailCurrent']} data-talkmap-current="1">
              <div className={styles['statusRailCurrentHead']}>{t('statusRail.current')}</div>
              <div
                className={\`\${styles['card']} \${props.current.lamp !== undefined ? styles[LAMP_CLASS[props.current.lamp]] ?? '' : ''} \${styles['statusRailCard']} \${styles['statusRailCurrentCard']}\`}
                role="button"
                tabIndex={0}
                title={t('statusRail.currentHint')}
                onClick={() => { props.onOpen(props.current!.cardId) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    props.onOpen(props.current!.cardId)
                  }
                }}
              >
                <div className={styles['cardTop']}>
                  <span className={styles['cardTitle']}>{props.current.title}</span>
                </div>
                {props.current.preview !== undefined && props.current.preview !== ''
                  ? <div className={styles['cardSummary']}>{props.current.preview}</div>
                  : null}
                <div className={styles['cardFooter']}>
                  <span className={styles['cardTime']}>{relativeTime(props.current.updatedAt)}</span>
                  {props.current.lamp !== undefined
                    ? (
                      <span className={\`\${styles['cardChip']} \${styles[LAMP_CHIP[props.current.lamp].className]}\`}>
                        {LAMP_CHIP[props.current.lamp].dot ? <span className={styles['runningDot']} /> : null}
                        {t(LAMP_CHIP[props.current.lamp].key)}
                      </span>
                    )
                    : <span className={styles['statusRailCurrentBack']}>{t('statusRail.currentBack')}</span>}
                </div>
              </div>
            </div>
          )
          : null}
        <div className={styles['statusRailList']} role="list">`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('StatusRail: current block')
}

// ── 3. strings ─────────────────────────────────────────────────────────────
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  const zh = [
    "  'statusRail.current': '当前任务',",
    "  'statusRail.currentHint': '点击回到这个会话',",
    "  'statusRail.currentBack': '点击返回 →',",
  ].join('\n')
  const en = [
    "  'statusRail.current': 'Current task',",
    "  'statusRail.currentHint': 'Click to go back to this conversation',",
    "  'statusRail.currentBack': 'Back →',",
  ].join('\n')
  const zhAnchor = "  'statusRail.title': '队列中的任务',"
  const enAnchor = "  'statusRail.title': 'Tasks in the queue',"
  if (!text.includes(zhAnchor) || !text.includes(enAnchor)) throw new Error('statusRail anchors missing')
  if (!text.includes("'statusRail.current'")) {
    text = text.replace(zhAnchor, zhAnchor + '\n' + zh)
    text = text.replace(enAnchor, enAnchor + '\n' + en)
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('i18n current block')
}

// ── 4. MapCanvas: feed it the current conversation ─────────────────────────
{
  const file = 'src/client/MapCanvas.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    '        onOpen={openRailCard}\n      />',
    '        onOpen={openRailCard}\n        {...(currentRailEntry !== undefined ? { current: currentRailEntry } : {})}\n      />',
  )
  text = text.replace(
    '  /** A rail tap opens that conversation (declared after openSession: it captures it). */',
    `  /**
   * The conversation the map was opened from, as the rail's top block. Absent when that
   * session has no card on this board (nothing to jump back to).
   */
  const currentRailEntry = useMemo<StatusRailCurrent | undefined>(() => {
    const sessionId = currentSessionId()
    if (sessionId === undefined) return undefined
    for (const [cardId, card] of Object.entries(visibleCards)) {
      if (card.sessionId !== sessionId || card.boardId !== INBOX_BOARD_ID) continue
      const summary = sessions.byId[sessionId]
      const lamp = glowOf(sessionId)
      const draft = draftTexts[sessionId]
      const body = draft !== undefined && draft !== '' ? draft : previews[sessionId]
      return {
        cardId,
        title: renamedTitles[sessionId] ?? summary?.displayTitle ?? sessionId,
        ...(lamp !== undefined ? { lamp } : {}),
        ...(body !== undefined ? { preview: body } : {}),
        ...(summary?.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),
      }
    }
    return undefined
  }, [visibleCards, sessions, renamedTitles, previews, draftTexts, statusById, alertById, finishedById])

  /** A rail tap opens that conversation (declared after openSession: it captures it). */`,
  )
  text = text.replace(
    "import { StatusRail, type StatusRailEntry, type StatusLamp } from './StatusRail.tsx'",
    "import { StatusRail, type StatusRailCurrent, type StatusRailEntry, type StatusLamp } from './StatusRail.tsx'",
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapCanvas: currentRailEntry')
}

// ── 5. css ─────────────────────────────────────────────────────────────────
{
  const file = 'src/client/talk-map.module.css'
  let sheet = fs.readFileSync(file, 'utf8')
  if (!sheet.includes('.statusRailCurrent {')) {
    sheet += String.raw`

/* ── the rail's "current task" block (top) ──────────────────────────────── */
.statusRailCurrent {
  flex: none;
  padding: 2px 0 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--dsw-alias-border-secondary);
}

.statusRailCurrentHead {
  padding: 0 4px 6px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-secondary);
}

.statusRailCurrentCard {
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary) inset;
}

.statusRailCurrentCard:hover {
  transform: translateY(-1px);
}

.statusRailCurrentBack {
  font-size: 10px;
  color: var(--dsw-alias-brand-primary);
}
`
  }
  fs.writeFileSync(file, sheet, 'utf8')
  edits.push('css current block')
}

console.log(edits.join('\n'))
