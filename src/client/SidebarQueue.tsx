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
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { talkMapApi } from './api.ts'
import { canvas, INBOX_BOARD_ID } from './canvas-store.ts'
import { readDraftTexts } from './draft-watch.ts'
import type { SessionListState, SessionStatusFact, SessionSummary } from './dsh.ts'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { closeMapPanel, getServices, openSessionInUi } from './map-state.ts'
import type { CardGlow } from './SessionCard.tsx'
import { LAMP_CHIP, LAMP_CLASS, relativeTime } from './SessionCard.tsx'
import { sortQueueRows } from './queue-order.ts'
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
  const askedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const timer = setInterval(() => { setDrafts(readDraftTexts()) }, 1500)
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

  // Only lamped cards, exactly like the rail.
  const rows = useMemo(() => {
    const out: { cardId: string; sessionId: string; title: string; lamp?: CardGlow; draft?: boolean; draftText?: string; updatedAt?: number }[] = []
    for (const [cardId, card] of Object.entries(canvasState.cards)) {
      if (card.boardId !== INBOX_BOARD_ID) continue
      const summary = sessions.byId[card.sessionId]
      const lamp = lampOf(card.sessionId, statusById.get(card.sessionId), summary, alerts, finished)
            // Draft-only cards join at the lowest priority (after every lamped card).
            const draftText = drafts[card.sessionId]
            const hasDraft = draftText !== undefined && draftText.trim() !== ''
            if (lamp === undefined && !hasDraft) continue
            if (lamp === 'done' && opened.has(card.sessionId)) continue
            const draftOnly = lamp === undefined
      out.push({
        cardId,
        sessionId: card.sessionId,
        title: summary?.displayTitle ?? card.sessionId,
        ...(draftOnly ? { draft: true } : { lamp }),
        ...(draftText !== undefined ? { draftText } : {}),
        ...(summary?.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),
      })
    }
    // Same rule as the map rail: priority bucket first, then newest inside it.
    return sortQueueRows(out)
  }, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened])

  // Card bodies: unsent draft first, else the user's last message (one batched Host call).
  useEffect(() => {
    const wanted = rows
      .slice(0, PREVIEW_LIMIT)
      .map(row => row.sessionId)
      .filter(id => !askedRef.current.has(id))
    if (wanted.length === 0) return
    for (const id of wanted) askedRef.current.add(id)
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
  }, [rows])

  if (rows.length === 0) return null

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
      <div className={styles['sidebarQueueHead']}>
        <span className={styles['sidebarQueueHeadText']}>{t('statusRail.title')}</span>
        <span className={styles['sidebarQueueCount']}>{rows.length}</span>
      </div>
      <div
        className={styles['sidebarQueueList']}
        role="list"
        style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '0 4px 6px', overscrollBehavior: 'contain' }}
      >
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
              className={`${styles['card']} ${row.lamp === undefined ? '' : styles[LAMP_CLASS[row.lamp]] ?? ''} ${styles['statusRailCard']} ${styles['sidebarQueueCard']}`}
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 'none', alignSelf: 'stretch' }}
              data-talkmap-queue={row.sessionId}
              data-lamp={row.lamp ?? 'draft'}
              title={row.title}
              role="button"
              tabIndex={0}
              onClick={() => {
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
              <div className={styles['cardTop']}>
                <span className={styles['cardTitle']}>{row.title}</span>
              </div>
              {body !== undefined && body.trim() !== ''
                ? <div className={styles['cardSummary']}>{body}</div>
                : null}
              <div className={styles['cardFooter']}>
                <span className={styles['cardTime']}>{relativeTime(row.updatedAt)}</span>
                {chip === undefined
                  ? <span className={`${styles['cardChip']} ${styles['cardChipDraft']}`}>{t('card.draft')}</span>
                  : (
                    <span className={`${styles['cardChip']} ${styles[chip.className]}`}>
                      {chip.dot === true ? <span className={styles['runningDot']} /> : null}
                      {t(chip.key)}
                    </span>
                  )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
