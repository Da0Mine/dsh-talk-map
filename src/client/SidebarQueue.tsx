/**
 * The map's queue, rendered inside the native DSH sidebar as the SAME cards the map's own
 * rail draws (title / draft body / time), scrollable, and never pushing the two original
 * buttons off the bottom.
 *
 * Everything is read client-side: the card set from the canvas store, titles from the
 * client sessions service. (An earlier version asked the Host through /talk-map/queue;
 * that route only ever returned ids, and a bug in it made the whole block silently empty.)
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { talkMapApi } from './api.ts'
import { canvas, INBOX_BOARD_ID } from './canvas-store.ts'
import { readDraftTexts } from './draft-watch.ts'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { closeMapPanel, getServices, openSessionInUi } from './map-state.ts'
import { relativeTime } from './SessionCard.tsx'
import type { SessionListState } from './dsh.ts'
import styles from './talk-map.module.css'

const EMPTY_SESSIONS: SessionListState = { ids: [], byId: {} }
/** How many cards get a body preview (the Host reads one session surface each). */
const PREVIEW_LIMIT = 14
const NO_SUBSCRIBE = (): (() => void) => () => {}
const emptySnapshot = (): SessionListState => EMPTY_SESSIONS

export function SidebarQueue(): React.JSX.Element | null {
  const canvasState = useSyncExternalStore(canvas.subscribe, canvas.get)
  const services = getServices()
  const list = services?.sessions.list
  // The sidebar action can mount before `sessions` is attached, so the fallback store keeps
  // the hook order stable instead of calling hooks conditionally.
  const sessions = useSyncExternalStore(
    list === undefined ? NO_SUBSCRIBE : (listener) => list.subscribe(listener),
    list === undefined ? emptySnapshot : () => list.getSnapshot(),
  )
  const locale = useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => readDraftTexts())
  // Card bodies: the user's last message, exactly like the map's rail cards. Fetched in one
  // batch for the visible head of the list; the Host reads a session surface per id, so we
  // never ask for the whole board at once.
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const asked = useRef<Set<string>>(new Set())

  useEffect(() => {
    const timer = setInterval(() => { setDrafts(readDraftTexts()) }, 1500)
    return () => { clearInterval(timer) }
  }, [])


  const rows = useMemo(() => {
    const entries = Object.entries(canvasState.cards)
      .filter(([, card]) => card.boardId === INBOX_BOARD_ID)
      .map(([cardId, card]) => {
        const summary = sessions.byId[card.sessionId]
        return {
          cardId,
          sessionId: card.sessionId,
          title: summary?.displayTitle ?? card.sessionId,
          updatedAt: summary?.updatedAt,
          draft: drafts[card.sessionId],
        }
      })
    entries.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    return entries
  }, [canvasState.cards, sessions, drafts])

  useEffect(() => {
    const wanted = rows
      .slice(0, PREVIEW_LIMIT)
      .map(row => row.sessionId)
      .filter(id => !asked.current.has(id))
    if (wanted.length === 0) return
    for (const id of wanted) asked.current.add(id)
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
      .catch(() => { for (const id of wanted) asked.current.delete(id) })
  }, [rows])


  // "待发送" wins over the last sent message, exactly like the map cards.
  const rowsWithBody = useMemo(
    () => rows.map(row => {
      const draft = row.draft
      const body = draft !== undefined && draft.trim() !== ''
        ? draft
        : previews[row.sessionId]
      return { ...row, body: body !== undefined && body.trim() !== '' ? body : undefined }
    }),
    [rows, previews],
  )

  if (rowsWithBody.length === 0) return null

  return (
    <div className={styles['sidebarQueue']} lang={locale} data-talkmap-queue-root="1">
      <div className={styles['sidebarQueueHead']}>
        <span className={styles['sidebarQueueHeadText']}>{t('statusRail.title')}</span>
        <span className={styles['sidebarQueueCount']}>{rowsWithBody.length}</span>
      </div>
      <div className={styles['sidebarQueueList']} role="list">
        {rowsWithBody.map((row) => {
          const body = row.body
          return (
            <div
              key={row.cardId}
              className={`${styles['card']} ${styles['statusRailCard']} ${styles['sidebarQueueCard']}`}
              data-talkmap-queue={row.sessionId}
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
              {body !== undefined
                ? <div className={styles['cardSummary']}>{body}</div>
                : null}
              <div className={styles['cardFooter']}>
                <span className={styles['cardTime']}>{relativeTime(row.updatedAt)}</span>
                {body !== undefined
                  ? <span className={`${styles['cardChip']} ${styles['cardChipDraft']}`}>{t('card.draft')}</span>
                  : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
