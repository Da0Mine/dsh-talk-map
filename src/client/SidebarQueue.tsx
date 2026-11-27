/**
 * The map's status rail, mirrored inside the native DSH sidebar.
 *
 * Same content as the rail: ONLY the cards that currently carry a lamp (running / waiting /
 * done / error), same card markup, same chips — never "every card on the board".
 *
 * Data is read client-side (the footer action slot only receives `wide`):
 *   cards  → canvas store (inbox board)
 *   status → sessions service summary (running / pendingInteraction / completed) plus the
 *            plugin's own alert + activity stores, i.e. the same inputs `glowOf` uses on
 *            the map (the panel-only `useSessionStatus` hook is not reachable here).
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { talkMapApi } from './api.ts'
import { canvas, INBOX_BOARD_ID } from './canvas-store.ts'
import { readDraftTexts } from './draft-watch.ts'
import type { SessionListState, SessionStatusFact, SessionSummary } from './dsh.ts'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { closeMapPanel, currentSessionId, getServices, openSessionInUi } from './map-state.ts'
import type { CardGlow } from './SessionCard.tsx'
import { LAMP_CHIP, LAMP_CLASS, relativeTime } from './SessionCard.tsx'
import { sortQueueRows } from './queue-order.ts'
import { PinMark } from './PinMark.tsx'
import { isPinnedSession, localPins } from './pins.ts'
import { useReorder } from './reorder.ts'
import { RailCardMenu, type RailMenuTarget } from './rail-menu.tsx'
import { sessionActivity } from './session-activity.ts'
import { sessionAlerts } from './session-alerts.ts'
import styles from './talk-map.module.css'

const EMPTY_SESSIONS: SessionListState = { ids: [], byId: {} }
const EMPTY_STATUS: ReadonlyMap<string, SessionStatusFact> = new Map()
const NO_SUBSCRIBE = (): (() => void) => () => {}
const emptySnapshot = (): SessionListState => EMPTY_SESSIONS
const emptyStatus = (): ReadonlyMap<string, SessionStatusFact> => EMPTY_STATUS
/** Remembered queue height in px (the handle drags it; clamped on use). */
const HEIGHT_KEY = 'dsh.talk-map.queueHeight'
const MIN_HEIGHT = 76

function clampHeight(value: number): number {
  const ceiling = Math.max(MIN_HEIGHT, Math.round(window.innerHeight * 0.7))
  return Math.min(ceiling, Math.max(MIN_HEIGHT, value))
}

function storedHeight(): number | undefined {
  try {
    const raw = window.localStorage.getItem(HEIGHT_KEY)
    if (raw === null || raw === '') return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? clampHeight(value) : undefined
  } catch {
    return undefined
  }
}

/** How many cards get a body preview (the Host reads one session surface each). */
const PREVIEW_LIMIT = 14

/** The rail's lamp rules, over sources a sidebar action can actually read. */
/**
 * The rail's lamp rules, verbatim. `status` is the same uiSession.sessionStatus snapshot the
 * map panel reads through its `useSessionStatus` prop, so both rails agree — deriving "done"
 * from the session summary instead made this side miss "waiting to be read" cards.
 */
function lampOf(
  sessionId: string,
  status: SessionStatusFact | undefined,
  summary: SessionSummary | undefined,
  alerts: ReadonlySet<string>,
  finished: ReadonlyMap<string, unknown>,
): CardGlow | undefined {
  if (alerts.has(sessionId)) return 'error'
  if (status?.pendingInteraction !== undefined) return 'waiting'
  if (status?.running === true || summary?.running === true) return 'running'
  // A session that is currently the main view has been read — the Host reconciles this
  // asynchronously, so honour the same rule here instead of keeping a stale lamp.
  const isMain = (summary?.retainedBy?.mainView ?? 0) > 0
  if (!isMain && (status?.completionUnread === true || finished.has(sessionId))) return 'done'
  return undefined
}

export function SidebarQueue(): React.JSX.Element | null {
  const canvasState = useSyncExternalStore(canvas.subscribe, canvas.get)
  const services = getServices()
  const list = services?.sessions.list
  const sessions = useSyncExternalStore(
    list === undefined ? NO_SUBSCRIBE : (listener) => list.subscribe(listener),
    list === undefined ? emptySnapshot : () => list.getSnapshot(),
  )
  // uiSession.sessionStatus: the exact store behind the panel's useSessionStatus hook.
  const statusStore = (services?.ctx?.get?.('uiSession') as
    { sessionStatus?: { getSnapshot(): ReadonlyMap<string, SessionStatusFact>; subscribe(l: () => void): () => void } } | undefined)?.sessionStatus
  const statusById = useSyncExternalStore(
    statusStore === undefined ? NO_SUBSCRIBE : (listener) => statusStore.subscribe(listener),
    statusStore === undefined ? emptyStatus : () => statusStore.getSnapshot(),
  )
  // ctx.workspaces is a ClientWorkspaceModel at runtime (subscribe + getSnapshot); our
  // type only declares the two methods we call elsewhere, so probe it defensively.
  const workspaceStore = services?.workspaces as unknown as {
    getSnapshot?: () => { archivedSessionIds?: readonly string[] }
    subscribe?: (listener: () => void) => () => void
  } | undefined
  const EMPTY_WORKSPACES: { archivedSessionIds?: readonly string[] } = {}
const emptyWorkspaces = (): { archivedSessionIds?: readonly string[] } => EMPTY_WORKSPACES
  const workspaceState = useSyncExternalStore(
    workspaceStore?.subscribe === undefined ? NO_SUBSCRIBE : (listener) => workspaceStore.subscribe!(listener),
    workspaceStore?.getSnapshot === undefined ? emptyWorkspaces : () => workspaceStore.getSnapshot!(),
  )
  const archivedSessionIds = useMemo(
    () => new Set(workspaceState.archivedSessionIds ?? []),
    [workspaceState],
  )
  const alerts = useSyncExternalStore(sessionAlerts.subscribe, sessionAlerts.getSnapshot)
  const finished = useSyncExternalStore(sessionActivity.subscribe, sessionActivity.getSnapshot)
  const locale = useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => readDraftTexts())
  const [previews, setPreviews] = useState<Record<string, string>>({})
  // Manual height: undefined = fit the cards, a number = what the user dragged to.
  const [height, setHeight] = useState<number | undefined>(() => storedHeight())
  const drag = useRef<{ startY: number; startHeight: number } | null>(null)
  // Sessions the user just opened from here. The Host clears "unread" only after the shell
  // reports the session as the main view, so without this the card lingers for a while.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set())
  /** Manual order for the queue rows (inside each priority bucket) and for the recent strip. */
  const [queueOrder, setQueueOrder] = useState<string[]>([])
  const [recentOrder, setRecentOrder] = useState<string[]>([])
  const [menu, setMenu] = useState<RailMenuTarget | null>(null)
  const localPinSet = useSyncExternalStore(localPins.subscribe, () => localPins.get())
  const askedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const timer = setInterval(() => {
      // A hidden window does not need the scan; the store is tiny but so is the fix.
      if (typeof document !== 'undefined' && document.hidden) return
      setDrafts(readDraftTexts())
    }, 1500)
    return () => { clearInterval(timer) }
  }, [])

  const onGripDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const block = event.currentTarget.parentElement
    const current = block === null ? MIN_HEIGHT : block.getBoundingClientRect().height
    drag.current = { startY: event.clientY, startHeight: current }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onGripMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const active = drag.current
    if (active === null) return
    // The block is anchored to the bottom, so dragging UP must make it taller.
    setHeight(clampHeight(active.startHeight + (active.startY - event.clientY)))
  }

  const onGripUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (drag.current === null) return
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    try {
      if (height === undefined) window.localStorage.removeItem(HEIGHT_KEY)
      else window.localStorage.setItem(HEIGHT_KEY, String(Math.round(height)))
    } catch { /* storage refused: the drag still applies for this session */ }
  }

  // The queue board lives in the sidebar and is therefore always mounted: observing the status
  // store here is what gives a conversation finished while the map is closed its 待查看 lamp.
  useEffect(() => {
    sessionActivity.observe(statusById, sessions.byId, { onlyBackground: true })
  }, [statusById, sessions])

  useEffect(() => {
    for (const sessionId of finished) {
      const summary = sessions.byId[sessionId]
      if ((summary?.retainedBy?.mainView ?? 0) > 0) sessionActivity.forget(sessionId)
    }
  }, [finished, sessions])

  useEffect(() => {
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

  const pinnedSessions = useMemo(() => new Set((workspaceState as { pinnedSessionIds?: readonly string[] }).pinnedSessionIds ?? []), [workspaceState])
  // Lamped sessions, exactly like the rail — but keyed off the session list, so a
  // conversation that just started shows up without the map panel ever being opened.
  const rows = useMemo(() => {
    // Existing card per session, kept only so the map can focus the right card.
    const cardBySession = new Map<string, string>()
    for (const [cardId, card] of Object.entries(canvasState.cards)) {
      if (card.boardId === INBOX_BOARD_ID) cardBySession.set(card.sessionId, cardId)
    }
    const out: { cardId: string; sessionId: string; title: string; lamp?: CardGlow; draft?: boolean; draftText?: string; updatedAt?: number }[] = []
    for (const sessionId of sessions.ids) {
      const summary = sessions.byId[sessionId]
      if (summary === undefined) continue
      // Same eligibility rules the map uses for placing a card.
      if (summary.blank === true) continue
      if (summary.origin === 'subagent') continue
      if (archivedSessionIds.has(sessionId)) continue
      const lamp = lampOf(sessionId, statusById.get(sessionId), summary, alerts, finished)
      // Draft-only rows join at the lowest priority (after every lamped row).
      const draftText = drafts[sessionId]
      const hasDraft = draftText !== undefined && draftText.trim() !== ''
      if (lamp === undefined && !hasDraft) continue
      if (lamp === 'done' && opened.has(sessionId)) continue
      const draftOnly = lamp === undefined
      const manual = queueOrder.indexOf(sessionId)
      out.push({
        cardId: cardBySession.get(sessionId) ?? sessionId,
        sessionId,
        ...(manual >= 0 ? { manualIndex: manual } : {}),
        ...(isPinnedSession(localPinSet, sessionId) ? { pinned: true } : {}),
        title: summary.displayTitle ?? sessionId,
        ...(draftOnly ? { draft: true } : { lamp }),
      ...(hasDraft ? { draft: true } : {}),
        ...(draftText !== undefined ? { draftText } : {}),
        ...(summary.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),
      })
    }
    // Same rule as the map rail: priority bucket first, then newest inside it.
    return sortQueueRows(out)
  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds, queueOrder, pinnedSessions, localPinSet])

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
  const activeSession = currentSessionId()

  const queueIds = rows.map(row => row.sessionId)
  useEffect(() => {
    setQueueOrder(current => {
      const kept = current.filter(id => queueIds.includes(id))
      const added = queueIds.filter(id => !kept.includes(id))
      const next = [...kept, ...added]
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueIds.join('|')])
  // A drag may only reorder inside one priority bucket, matching the rail's rule.
  const bucketOfRow = useCallback((sessionId: string): number => {
    const row = rows.find(entry => entry.sessionId === sessionId)
    return row === undefined ? 0 : queueRank(row.lamp, row.draft === true, isPinnedSession(localPinSet, sessionId))
  }, [rows, pinnedSessions, localPinSet])
  const queueDrag = useReorder(queueIds, setQueueOrder, { bucketOf: bucketOfRow })

  const recentIds = recentRows.map(row => row.sessionId)
  useEffect(() => {
    setRecentOrder(current => {
      const kept = current.filter(id => recentIds.includes(id))
      const added = recentIds.filter(id => !kept.includes(id))
      const next = [...kept, ...added]
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentIds.join('|')])
  const recentRowsOrdered = useMemo(() => {
    const byId = new Map(recentRows.map(row => [row.sessionId, row]))
    const ordered = recentOrder.map(id => byId.get(id)).filter((row): row is (typeof recentRows)[number] => row !== undefined)
    for (const row of recentRows) if (!recentOrder.includes(row.sessionId)) ordered.push(row)
    const pinnedFirst = ordered.filter(row => isPinnedSession(localPinSet, row.sessionId))
    const rest = ordered.filter(row => !isPinnedSession(localPinSet, row.sessionId))
    return [...pinnedFirst, ...rest]
  }, [recentRows, recentOrder, localPinSet])
  // Pinned recent sessions behave like queue rows: they move above the strip.
  const pinnedExtraRows = useMemo(() => recentRowsOrdered
    .filter(row => isPinnedSession(localPinSet, row.sessionId))
    .map(row => ({
      cardId: row.cardId,
      sessionId: row.sessionId,
      title: row.title,
      ...(row.updatedAt !== undefined ? { updatedAt: row.updatedAt, stamp: row.updatedAt } : {}),
      pinned: true,
    })), [recentRowsOrdered, localPinSet])
  const unpinnedRecentRows = recentRowsOrdered.filter(row => !isPinnedSession(localPinSet, row.sessionId))
  const recentRenderedIds = recentRowsOrdered.map(row => row.sessionId)
  const recentDrag = useReorder(recentRenderedIds, setRecentOrder)

  // Card bodies: unsent draft first, else the user's last message (one batched Host call).
  useEffect(() => {
    const wanted = [...rows, ...recentRows]
      .slice(0, PREVIEW_LIMIT + 3)
      .filter(row => !askedRef.current.has(row.sessionId))
      .map(row => ({ id: row.sessionId, stamp: row.updatedAt ?? 0 }))
    if (wanted.length === 0) return
    for (const item of wanted) askedRef.current.add(item.id)
    void talkMapApi.lastUserMessages(wanted)
      .then((page) => {
        setPreviews((current) => {
          const next = { ...current }
          for (const [id, text] of Object.entries(page.texts)) {
            if (typeof text === 'string' && text.trim() !== '') next[id] = text
          }
          return next
        })
      })
      .catch(() => { for (const id of wanted) askedRef.current.delete(id) })
  }, [rows, recentRows])

  // The board stays mounted even with nothing queued: hiding it made the whole section vanish
  // from the sidebar, which read as a bug rather than as "no tasks".

  return (
    <div
      className={styles['sidebarQueue']}
      lang={locale}
      data-talkmap-queue-root="1"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        flex: '1 1 auto',
        ...(height === undefined ? { maxHeight: '46vh' } : { height: `${height}px`, maxHeight: '70vh' }),
      }}
    >
      <div
        className={styles['queueGrip']}
        role="separator"
        aria-orientation="horizontal"
        title={t('statusRail.resize')}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onPointerCancel={onGripUp}
        onDoubleClick={() => {
          setHeight(undefined)
          try { window.localStorage.removeItem(HEIGHT_KEY) } catch { /* ignore */ }
        }}
      >
        <span className={styles['queueGripBar']} />
      </div>
      {menu !== null
        ? <RailCardMenu target={menu} onClose={() => { setMenu(null) }} />
        : null}
      <div className={styles['sidebarQueueHead']}>
        <span className={styles['sidebarQueueHeadText']}>{t('statusRail.title')}</span>
        <span className={styles['sidebarQueueCount']}>{rows.length}</span>
      </div>
      <div
        className={styles['sidebarQueueList']}
        role="list"
        style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '10px 16px 12px', overscrollBehavior: 'contain' }}
      >
        {rows.length === 0
          ? <div className={styles['sidebarQueueEmpty']}>{t('statusRail.empty')}</div>
          : null}
        {pinnedExtraRows.map((row) => {
          // Pinned recent sessions rendered with the queue row look (and the pin mark).
          return (
            <div
              key={`pin-${row.sessionId}`}
              className={`${styles[`card`] ?? ''} ${styles[`statusRailCard`] ?? ''} ${styles[`sidebarQueueCard`] ?? ''}`}
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 'none', alignSelf: 'stretch' }}
              onClick={() => { openSessionInUi(row.sessionId); setOpened(current => new Set([...current, row.sessionId])) }}
              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({ sessionId: row.sessionId, title: row.title, pinned: isPinnedSession(localPinSet, row.sessionId), x: event.clientX, y: event.clientY })
              }}
            >
              <div className={styles[`cardTop`]}>
                <PinMark />
                <span className={styles[`cardTitle`]}>{row.title}</span>
              </div>
              {(previews[row.sessionId] ?? '').trim() !== ''
                ? <div className={styles[`cardSummary`]}>{previews[row.sessionId]}</div>
                : null}
              <div className={styles[`cardFooter`]}>
                <span className={styles[`cardTime`]}>{relativeTime(row.updatedAt)}</span>
              </div>
            </div>
          )
        })}
        {rows.map((row) => {
          // Unsent text wins (it is what the card is about), otherwise the last message.
          const draftText = row.draftText
          const body = draftText !== undefined && draftText.trim() !== ''
            ? draftText
            : previews[row.sessionId]
          const chip = row.lamp === undefined ? undefined : LAMP_CHIP[row.lamp]
          return (
            <div
              key={row.cardId}
              ref={element => { queueDrag.register(row.sessionId, element) }}
              onPointerDown={event => { queueDrag.begin(event, row.sessionId) }}
              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({
                  sessionId: row.sessionId,
                  title: row.title,
                  pinned: isPinnedSession(localPinSet, row.sessionId) || pinnedSessions.has(row.sessionId),
                  x: event.clientX,
                  y: event.clientY,
                })
              }}
              className={`${styles['card']} ${row.lamp === undefined ? '' : styles[LAMP_CLASS[row.lamp]] ?? ''} ${styles['statusRailCard']} ${styles['sidebarQueueCard']}`}
              style={{
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                flex: 'none',
                alignSelf: 'stretch',
                touchAction: 'none',
                transform: `translateY(${queueDrag.draggingId === row.sessionId ? queueDrag.offsetY : queueDrag.shiftOf(row.sessionId) + queueDrag.flipOf(row.sessionId)}px)`,
                transition: queueDrag.draggingId === row.sessionId || queueDrag.flipping ? 'none' : 'transform 150ms ease',
                ...(queueDrag.draggingId === row.sessionId ? { zIndex: 3, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' } : {}),
              }}
              data-talkmap-queue={row.sessionId}
              data-lamp={row.lamp ?? 'draft'}
              title={row.title}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (queueDrag.shouldIgnoreClick()) return
                // Drop this plugin's own "finished, unread" mark immediately: it is only
                // ever cleared when the map panel remounts, which is why the card used to
                // linger until the map was opened.
                sessionActivity.forget(row.sessionId)
                setOpened((current) => new Set(current).add(row.sessionId))
                closeMapPanel()
                openSessionInUi(row.sessionId)
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                sessionActivity.forget(row.sessionId)
                setOpened((current) => new Set(current).add(row.sessionId))
                closeMapPanel()
                openSessionInUi(row.sessionId)
              }}
            >
              {row.sessionId === activeSession
                ? <span className={styles['cardReticle']} aria-hidden="true"><i /><i /><i /><i /></span>
                : null}
              <div className={styles['cardTop']}>
                <>
        {isPinnedSession(localPinSet, row.sessionId) ? <PinMark /> : null}
        <span className={styles['cardTitle']}>{row.title}</span>
      </>
              </div>
              {body !== undefined && body.trim() !== ''
                ? <div className={styles['cardSummary']}>{body}</div>
                : null}
              <div className={styles['cardFooter']}>
                <span className={styles['cardTime']}>{relativeTime(row.updatedAt)}</span>
                                {/* Draft first, then the status chip: they can both be true. */}
                                {row.draft === true
                                  ? <span className={`${styles['cardChip']} ${styles['cardChipDraft']}`}>{t('card.draft')}</span>
                                  : null}
                                {row.lamp === undefined
                                  ? null
                                  : (
                                    <span className={`${styles['cardChip']} ${styles[LAMP_CHIP[row.lamp].className]}`}>
                                      {LAMP_CHIP[row.lamp].dot ? <span className={styles['runningDot']} /> : null}
                                      {t(LAMP_CHIP[row.lamp].key)}
                                    </span>
                                  )}
              </div>
            </div>
          )
        })}
        {recentRows.length > 0
          ? (
            <>
              <div className={styles['sidebarQueueRecentHead']}>{t('statusRail.recent')}</div>
              {recentRowsOrdered.map((row) => (
                <div
                  key={'recent-' + row.sessionId}
                  ref={element => { recentDrag.register(row.sessionId, element) }}
                  onPointerDown={event => { recentDrag.begin(event, row.sessionId) }}
                  className={`${styles['card']} ${styles['statusRailCard']} ${styles['sidebarQueueCard']}`}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    flex: 'none',
                    alignSelf: 'stretch',
                    touchAction: 'none',
                    transform: `translateY(${recentDrag.draggingId === row.sessionId ? recentDrag.offsetY : recentDrag.shiftOf(row.sessionId) + recentDrag.flipOf(row.sessionId)}px)`,
                    transition: recentDrag.draggingId === row.sessionId || recentDrag.flipping ? 'none' : 'transform 150ms ease',
                    ...(recentDrag.draggingId === row.sessionId ? { zIndex: 3, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' } : {}),
                  }}
                  data-talkmap-queue-recent={row.sessionId}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setMenu({
                      sessionId: row.sessionId,
                      title: row.title,
                      pinned: isPinnedSession(localPinSet, row.sessionId) || pinnedSessions.has(row.sessionId),
                      x: event.clientX,
                      y: event.clientY,
                    })
                  }}
                  title={row.title}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (recentDrag.shouldIgnoreClick()) return
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
                    <>
        {isPinnedSession(localPinSet, row.sessionId) ? <PinMark /> : null}
        <span className={styles['cardTitle']}>{row.title}</span>
      </>
                  </div>
                  {(previews[row.sessionId] ?? '').trim() !== ''
                    ? <div className={styles['cardSummary']}>{previews[row.sessionId]}</div>
                    : null}
                  <div className={styles['cardFooter']}>
                    <span className={styles['cardTime']}>{relativeTime(row.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </>
          )
          : null}
      </div>
    </div>
  )
}
