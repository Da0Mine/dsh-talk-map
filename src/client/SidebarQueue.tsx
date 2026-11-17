/**
 * The map's queue as it appears inside the native DSH sidebar: compact cards under the
 * workspace list. A click opens that conversation (same path as a rail card's tap).
 *
 * It polls the Host because the sidebar action slot only receives { wide } — the card
 * status hooks belong to the map panel, not to here.
 */
import { useEffect, useMemo, useState } from 'react'
import { talkMapApi } from './api.ts'
import { readDraftTexts } from './draft-watch.ts'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { closeMapPanel, openSessionInUi } from './map-state.ts'
import { relativeTime } from './SessionCard.tsx'
import { useSyncExternalStore } from 'react'
import styles from './talk-map.module.css'

interface QueueEntry {
  cardId: string
  sessionId: string
  title: string
  updatedAt?: number
}

const POLL_MS = 5000
/** Above this many cards the list scrolls instead of pushing the toggle row off. */
const MAX_VISIBLE = 6

export function SidebarQueue(): React.JSX.Element | null {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  // The sidebar action lives outside the map panel, so language changes need this feed.
  const locale = useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)

  useEffect(() => {
    let alive = true
    const load = (): void => {
      void talkMapApi.queue()
        .then((page) => { if (alive) setEntries(page.entries) })
        .catch(() => { /* the map may still be booting; the next tick retries */ })
      setDrafts(readDraftTexts())
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  const shown = useMemo(() => entries.slice(0, MAX_VISIBLE), [entries])

  if (shown.length === 0) return null

  return (
    <div className={styles['sidebarQueue']} lang={locale}>
      <div className={styles['sidebarQueueHead']}>
        {t('statusRail.title')}
        <span className={styles['sidebarQueueCount']}>{entries.length}</span>
      </div>
      <div className={styles['sidebarQueueList']} role="list">
        {shown.map(entry => {
          const draft = drafts[entry.sessionId]
          const body = draft !== undefined && draft.trim() !== '' ? draft : undefined
          return (
            <button
              key={entry.cardId}
              type="button"
              role="listitem"
              className={styles['sidebarQueueItem']}
              data-talkmap-queue={entry.sessionId}
              title={entry.title}
              onClick={() => {
                closeMapPanel()
                openSessionInUi(entry.sessionId)
              }}
            >
              <span className={styles['sidebarQueueTitle']}>{entry.title}</span>
              <span className={styles['sidebarQueueMeta']}>
                {body !== undefined
                  ? <span className={styles['sidebarQueueDraft']}>{body}</span>
                  : null}
                <span className={styles['sidebarQueueTime']}>{relativeTime(entry.updatedAt)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
