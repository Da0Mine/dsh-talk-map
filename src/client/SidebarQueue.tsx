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
import type { SessionListState, SessionSummary } from './dsh.ts'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { closeMapPanel, getServices, openSessionInUi } from './map-state.ts'
import type { CardGlow } from './SessionCard.tsx'
import { LAMP_CHIP, LAMP_CLASS, relativeTime } from './SessionCard.tsx'
import { sessionActivity } from './session-activity.ts'
import { sessionAlerts } from './session-alerts.ts'
import styles from './talk-map.module.css'

const EMPTY_SESSIONS: SessionListState = { ids: [], byId: {} }
const NO_SUBSCRIBE = (): (() => void) => () => {}
const emptySnapshot = (): SessionListState => EMPTY_SESSIONS
/** How many cards get a body preview (the Host reads one session surface each). */
const PREVIEW_LIMIT = 14

/** The rail's lamp rules, over sources a sidebar action can actually read. */
function lampOf(
  sessionId: string,
  summary: SessionSummary | undefined,
  alerts: ReadonlySet<string>,
  finished: ReadonlyMap<string, unknown>,
): CardGlow | undefined {
  if (alerts.has(sessionId)) return 'error'
  if (summary?.pendingInteraction !== undefined) return 'waiting'
  if (summary?.running === true) return 'running'
  if (summary?.completed === true || finished.has(sessionId)) return 'done'
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
  const alerts = useSyncExternalStore(sessionAlerts.subscribe, sessionAlerts.getSnapshot)
  const finished = useSyncExternalStore(sessionActivity.subscribe, sessionActivity.getSnapshot)
  const locale = useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => readDraftTexts())
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const askedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const timer = setInterval(() => { setDrafts(readDraftTexts()) }, 1500)
    return () => { clearInterval(timer) }
  }, [])

  // Only lamped cards, exactly like the rail.
  const rows = useMemo(() => {
    const out: { cardId: string; sessionId: string; title: string; lamp: CardGlow; updatedAt?: number; draft?: string }[] = []
    for (const [cardId, card] of Object.entries(canvasState.cards)) {
      if (card.boardId !== INBOX_BOARD_ID) continue
      const summary = sessions.byId[card.sessionId]
      const lamp = lampOf(card.sessionId, summary, alerts, finished)
      if (lamp === undefined) continue
      out.push({
        cardId,
        sessionId: card.sessionId,
        title: summary?.displayTitle ?? card.sessionId,
        lamp,
        ...(summary?.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),
        ...(drafts[card.sessionId] !== undefined ? { draft: drafts[card.sessionId] } : {}),
      })
    }
    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    return out
  }, [canvasState.cards, sessions, alerts, finished, drafts])

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
      style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, minHeight: 0, maxHeight: '46vh', overflow: 'hidden', flex: '1 1 auto' }}
    >
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
          const draft = row.draft
          const body = draft !== undefined && draft.trim() !== ''
            ? draft
            : previews[row.sessionId]
          const chip = LAMP_CHIP[row.lamp]
          return (
            <div
              key={row.cardId}
              className={`${styles['card']} ${styles[LAMP_CLASS[row.lamp]] ?? ''} ${styles['statusRailCard']} ${styles['sidebarQueueCard']}`}
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 'none', alignSelf: 'stretch' }}
              data-talkmap-queue={row.sessionId}
              data-lamp={row.lamp}
              title={row.title}
              role="button"
              tabIndex={0}
              onClick={() => {
                closeMapPanel()
                openSessionInUi(row.sessionId)
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
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
                <span className={`${styles['cardChip']} ${styles[chip.className]}`}>
                  {chip.dot === true ? <span className={styles['runningDot']} /> : null}
                  {t(chip.key)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
