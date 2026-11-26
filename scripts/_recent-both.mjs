import fs from 'node:fs'

// ---------- MapCanvas：recentEntries + 传参 ----------
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')

  const anchor = `  }, [visibleCards, sessions, renamedTitles, previews, draftTexts, pinnedSessions, statusById, alertById, finishedById])`
  if (!t.includes(anchor)) throw new Error('statusEntries anchor missing')
  t = t.replace(anchor, `${anchor}

  /**
   * Cards with nothing to report (no lamp, no unsent text), newest first — the「最近的任务」
   * strip at the bottom of the rail. They used to vanish the moment their status cleared;
   * keeping the three most recent gives the queue a history.
   */
  const recentEntries = useMemo<StatusRailEntry[]>(() => {
    const listed = new Set(statusEntries.map(entry => entry.sessionId))
    const rows: StatusRailEntry[] = []
    for (const [cardId, card] of Object.entries(visibleCards)) {
      if (card.boardId !== INBOX_BOARD_ID) continue
      if (listed.has(card.sessionId)) continue
      const summary = sessions.byId[card.sessionId]
      rows.push({
        cardId,
        sessionId: card.sessionId,
        title: renamedTitles[card.sessionId] ?? summary?.displayTitle ?? card.sessionId,
        stamp: summary?.updatedAt ?? 0,
        ...(summary?.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),
        ...(previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),
      })
    }
    rows.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    return rows.slice(0, 3)
  }, [visibleCards, sessions, statusEntries, renamedTitles, previews])`)

  t = t.replace(
    `        onFocus={focusCard}
        onOpen={openRailCard}
      />`,
    `        onFocus={focusCard}
        onOpen={openRailCard}
        recent={recentEntries}
        currentSessionId={currentSessionId()}
      />`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: recentEntries + props')
}

// ---------- SidebarQueue：最近的任务 + 瞄准镜 ----------
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')

  t = t.replace(
    `import { closeMapPanel, getServices, openSessionInUi } from './map-state.ts'`,
    `import { closeMapPanel, currentSessionId, getServices, openSessionInUi } from './map-state.ts'`,
  )

  const anchor = `  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds])`
  if (!t.includes(anchor)) throw new Error('rows anchor missing')
  t = t.replace(anchor, `${anchor}

  /** Same idea as the rail: the three most recent sessions with nothing to report. */
  const recentRows = useMemo(() => {
    const listed = new Set(rows.map(row => row.sessionId))
    const out: { sessionId: string; cardId: string; title: string; updatedAt?: number }[] = []
    for (const sessionId of sessions.ids) {
      const summary = sessions.byId[sessionId]
      if (summary === undefined) continue
      if (summary.blank === true) continue
      if (summary.origin === 'subagent') continue
      if (archivedSessionIds.has(sessionId)) continue
      if (listed.has(sessionId)) continue
      out.push({
        sessionId,
        cardId: sessionId,
        title: summary.displayTitle ?? sessionId,
        ...(summary.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),
      })
    }
    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    return out.slice(0, 3)
  }, [rows, sessions, archivedSessionIds])
  const activeSession = currentSessionId()`)

  t = t.replace(
    `        })}
      </div>`,
    `        })}
        {recentRows.length > 0
          ? (
            <>
              <div className={styles['sidebarQueueRecentHead']}>{t('statusRail.recent')}</div>
              {recentRows.map((row) => (
                <div
                  key={'recent-' + row.sessionId}
                  className={\`\${styles['card']} \${styles['statusRailCard']} \${styles['sidebarQueueCard']}\`}
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 'none', alignSelf: 'stretch' }}
                  data-talkmap-queue-recent={row.sessionId}
                  title={row.title}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    sessionActivity.forget(row.sessionId)
                    setOpened((current) => new Set(current).add(row.sessionId))
                    openSessionInUi(row.sessionId)
                    closeMapPanel()
                  }}
                >
                  {row.sessionId === activeSession
                    ? <span className={styles['cardReticle']} aria-hidden="true"><i /><i /><i /><i /></span>
                    : null}
                  <div className={styles['cardTop']}>
                    <span className={styles['cardTitle']}>{row.title}</span>
                  </div>
                  <div className={styles['cardFooter']}>
                    <span className={styles['cardTime']}>{relativeTime(row.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </>
          )
          : null}
      </div>`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: recentRows + reticle')
}

// ---------- CSS ----------
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('.statusRailRecentHead {')) {
    t += `
/* The「最近的任务」divider: cards that lost their status drop here (max three). */
.statusRailRecentHead,
.sidebarQueueRecentHead {
  margin: 6px 2px 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--dsw-alias-label-secondary);
}

.sidebarQueueRecentHead {
  margin: 4px 2px 0;
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: recent 分隔标题')
  }
}
