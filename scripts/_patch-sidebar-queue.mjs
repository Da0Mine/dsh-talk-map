/**
 * The map's task queue, rendered inside the native DSH sidebar.
 *
 * The sidebar's own `sidebar.workspaces` slot is a single-slot section (replacing it would
 * kill the workspace list), so the queue rides the list slot we already own
 * (`sidebar.footer.action`): that entry renders a column — queue cards first, the map
 * toggle row last — which fills the empty space under the workspaces.
 *
 * Data comes from a Host route (`/talk-map/queue`) because the card status hooks are only
 * injected into the `main` panel, not into a sidebar action.
 */
import fs from 'node:fs'

const edits = []

// ── 1. host: expose the queue ──────────────────────────────────────────────
{
  const file = 'src/host/routes.ts'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    '  sessionQuery?: { readSurface(sessionId: string): Promise<{ events: readonly unknown[]; capturedThroughSeq: number | null }> }',
    `  sessionQuery?: {
    readSurface(sessionId: string): Promise<{ events: readonly unknown[]; capturedThroughSeq: number | null }>
    /** Session records (header.id / header.title / header.updatedAt) for the queue. */
    listSessions?(): Promise<readonly unknown[]>
  }`,
  )

  const anchor = "        if (route === 'POST /talk-map/context-window') {"
  if (!text.includes(anchor)) throw new Error('queue anchor missing')
  const block = `        if (route === 'POST /talk-map/queue') {
          // The native sidebar's queue list. Cards live in this plugin's store; titles and
          // timestamps come from the Host's session records, sorted newest first.
          const cards: { cardId: string; sessionId: string }[] = []
          for (const [cardId, card] of store.cards.entries()) {
            const sessionId = (card as { sessionId?: unknown }).sessionId
            if (typeof sessionId === 'string') cards.push({ cardId, sessionId })
          }
          let records: readonly unknown[] = []
          const query = runtime.sessionQuery
          if (query !== undefined && typeof query.listSessions === 'function') {
            try {
              records = await query.listSessions()
            } catch {
              records = []
            }
          }
          const byId = new Map<string, Record<string, unknown>>()
          for (const raw of records) {
            const record = raw as { header?: { id?: unknown } }
            const id = record?.header?.id
            if (typeof id === 'string') byId.set(id, raw as Record<string, unknown>)
          }
          const entries = cards.map((card) => {
            const record = byId.get(card.sessionId)
            const header = (record?.header ?? {}) as Record<string, unknown>
            const title = typeof header.title === 'string' && header.title !== ''
              ? header.title
              : typeof record?.title === 'string' ? record.title : ''
            const updated = [header.updatedAt, record?.updatedAt, header.lastActivityAt]
              .find(value => typeof value === 'number')
            return {
              cardId: card.cardId,
              sessionId: card.sessionId,
              title: title === '' ? card.sessionId : title,
              ...(typeof updated === 'number' ? { updatedAt: updated } : {}),
            }
          })
          entries.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
          sendJson(response, 200, { entries })
          return
        }

`
  fs.writeFileSync(file, text.replace(anchor, block + anchor), 'utf8')
  edits.push('route /talk-map/queue')
}

// ── 2. client api ──────────────────────────────────────────────────────────
{
  const file = 'src/client/api.ts'
  let text = fs.readFileSync(file, 'utf8')
  const anchor = `  contextWindow(sessionId: string, maxChars?: number): Promise<{`
  if (!text.includes(anchor)) throw new Error('api anchor missing')
  const method = `  /** The map's queue for the native sidebar: cards joined with session titles. */
  queue(): Promise<{ entries: { cardId: string; sessionId: string; title: string; updatedAt?: number }[] }> {
    return postJson('/talk-map/queue', {})
  },
${anchor}`
  fs.writeFileSync(file, text.replace(anchor, method), 'utf8')
  edits.push('api.queue()')
}

// ── 3. the sidebar queue component ─────────────────────────────────────────
{
  const file = 'src/client/SidebarQueue.tsx'
  const source = `/**
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
`
  fs.writeFileSync(file, source, 'utf8')
  edits.push('SidebarQueue.tsx')
}

// ── 4. mount it above the toggle row ───────────────────────────────────────
{
  const file = 'src/client/MapToggleButton.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    "import { closeMapPanel, currentSessionId, mapUi, openSessionInUi, reportSidebarWide } from './map-state.ts'",
    "import { closeMapPanel, currentSessionId, mapUi, openSessionInUi, reportSidebarWide } from './map-state.ts'\nimport { SidebarQueue } from './SidebarQueue.tsx'",
  )
  text = text.replace(
    `  return (
    <div className={\`\${styles['toggleWrap']}\${wide ? \` \${styles['toggleWrapWide']}\` : ''}\`}>`,
    `  return (
    <div className={\`\${styles['toggleWrap']}\${wide ? \` \${styles['toggleWrapWide']}\` : ''}\`}>
      {/* The queue fills the empty space under the workspace list; it only makes sense
          when the sidebar is expanded into its wide form. */}
      {wide ? <SidebarQueue /> : null}`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapToggleButton: mounts SidebarQueue')
}

// ── 5. css ─────────────────────────────────────────────────────────────────
{
  const file = 'src/client/talk-map.module.css'
  let sheet = fs.readFileSync(file, 'utf8')
  if (!sheet.includes('.sidebarQueue {')) {
    sheet += String.raw`

/* ── the queue inside the native sidebar ────────────────────────────────── */
.sidebarQueue {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  padding: 4px 0 2px;
}

.sidebarQueueHead {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 10px 6px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}

.sidebarQueueCount {
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  font-variant-numeric: tabular-nums;
}

.sidebarQueueList {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 34vh;
  overflow-y: auto;
  padding: 0 8px;
  overscroll-behavior: contain;
}

.sidebarQueueItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-secondary);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.03));
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.sidebarQueueItem:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sidebarQueueTitle {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebarQueueMeta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 10px;
  color: var(--dsw-alias-label-secondary);
}

.sidebarQueueDraft {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-brand-primary);
}

.sidebarQueueTime {
  flex: none;
  font-variant-numeric: tabular-nums;
}
`
  }
  fs.writeFileSync(file, sheet, 'utf8')
  edits.push('css sidebarQueue')
}

console.log(edits.join('\n'))