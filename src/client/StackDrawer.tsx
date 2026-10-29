/**
 * The drawer behind a folder's stack cell: every conversation of that
 * workspace, at 1:1 size (224px wide — exactly what the map looks like at
 * 100% zoom), in a multi-column grid. The wheel pages one ROW at a time, like a
 * phone's app drawer.
 */
import { useEffect, useRef, useState } from 'react'
import { mapUi } from './map-state.ts'
import { t } from './i18n.ts'
import { relativeTime, LAMP_CHIP } from './SessionCard.tsx'
import type { CardGlow } from './SessionCard.tsx'
import { drawerState } from './drawer-state.ts'
import { loadSearch, saveSearch } from './search-store.ts'
import { SearchResults } from './SearchResults.tsx'
import { SearchLoading } from './SearchLoading.tsx'
import styles from './talk-map.module.css'
const LAMP_CLASS: Record<CardGlow, string> = {
  running: 'cardLampRunning',
  done: 'cardLampDone',
  error: 'cardLampError',
  waiting: 'cardLampWaiting',
}

/**
 * Pitch of one grid row. The cards sit in a multi-column grid, so the step is
 * the distance between the first card of this row and the first card of the
 * next one (falling back to a single card's height when there is only one row).
 */
function rowStep(scroller: HTMLElement): number {
  const cards = [...scroller.querySelectorAll('[data-stack-card]')] as HTMLElement[]
  const first = cards[0]
  if (first === undefined) return 140
  const nextRow = cards.find(card => card.offsetTop > first.offsetTop + 2)
  if (nextRow !== undefined) return nextRow.offsetTop - first.offsetTop
  return first.offsetHeight + 12
}

/** Split `text` around every occurrence of `query` and mark the matches. */
function highlight(text: string, query: string): React.ReactNode[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [text]
  const haystack = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let cursor = 0
  let key = 0
  while (cursor < text.length) {
    const at = haystack.indexOf(needle, cursor)
    if (at < 0) { parts.push(text.slice(cursor)); break }
    if (at > cursor) parts.push(text.slice(cursor, at))
    parts.push(<mark key={key++} className={styles['hitMark']}>{text.slice(at, at + needle.length)}</mark>)
    cursor = at + needle.length
  }
  return parts
}

/** The Host answers this when the deployment turned the session index off. */
function isIndexDisabled(message: string): boolean {
  return message.includes('search is disabled') || message.includes('SESSION_QUERY_SEARCH_DISABLED')
}

/**
 * One conversation that matched. Each match is a small block of context
 * lines (one above / the match / one below), so a session with several hits
 * is ONE section with several blocks.
 */
export interface DrawerSearchHit {
  sessionId: string
  title: string
  blocks: string[][]
  /** Event seq per block, when the Host supplied one. */
  seqs?: (number | null)[]
  /** Main conversation, or one an agent spawned. */
  agent?: 'main' | 'subagent'
  depth?: number
}

export interface StackEntry {
  cardId: string
  sessionId: string
  title: string
  /** The user's latest message (card body). */
  preview?: string
  nextStep?: string
  updatedAt?: number
  running?: boolean
  glow?: CardGlow
  /** Unsent text sits in this conversation's composer. */
  pendingDraft?: boolean
  /** Its last run was cut off by closing the app. */
  interrupted?: boolean
  /** Pinned in the sidebar. */
  pinned?: boolean
}

export interface StackDrawerProps {
  /** Storage scope of this folder's search. */
  groupId: string
  workspaceTitle: string
  items: readonly StackEntry[]
  onOpenCard: (cardId: string) => void
  /** Right-click on a card: the same card menu the grid uses. */
  onCardMenu?: (cardId: string, event: React.MouseEvent) => void
  /**
   * Full-text search across EVERY conversation (the Host session/search).
   * Absent = the drawer only filters its own titles.
   */
  onSearchContent?: (query: string) => Promise<DrawerSearchHit[]>
  /** Open a session found by the content search, ideally at that event. */
  onOpenSession?: (sessionId: string, q?: string) => void
  /** Every extra hit inside one conversation, loaded on demand. */
  onFetchSessionHits?: (sessionId: string, query: string) => Promise<{
    blocks: string[][]
    seqs: (number | null)[]
  }>
  /** The passage around one hit — fetched on hover, not with the search. */
  onFetchContext?: (sessionId: string, seq: number, query: string) => Promise<string[]>
  onClose: () => void
}

export function StackDrawer(props: StackDrawerProps): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const remembered = loadSearch<DrawerSearchHit>('drawer:' + props.groupId)
  const [query, setQuery] = useState(remembered?.query ?? '')
  const [hits, setHits] = useState<DrawerSearchHit[]>(remembered?.hits ?? [])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  /** The passage under the pointer, in a floating box (null = nothing). */

  // The title filter is instant and local. The content search costs a corpus
  // query, so it runs only when the user submits (Enter or the 搜索 button) —
  // not on every keystroke.
  const runSearch = async (): Promise<void> => {
    const trimmed = query.trim()
    if (trimmed.length < 2 || props.onSearchContent === undefined) {
      setHits([])
      setSearchError(null)
      return
    }
    setSearching(true)
    try {
      const found = await props.onSearchContent(trimmed)
      setHits(found)
      saveSearch('drawer:' + props.groupId, { query: trimmed, hits: found })
      setSearchError(null)
    } catch (cause) {
      console.warn('[dsh-talk-map] content search failed:', cause)
      setHits([])
      setSearchError(String((cause as Error)?.message ?? cause))
    } finally {
      setSearching(false)
    }
  }

  const needle = query.trim().toLowerCase()
  const visibleItems = needle === ''
    ? props.items
    : props.items.filter(item => item.title.toLowerCase().includes(needle))
  // Coming back from a conversation should land on the same rows.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller === null) return
    scroller.scrollTop = drawerState.readScroll()
  }, [])

  useEffect(() => {
    const release = mapUi.claimEscape('stack-drawer')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      requestClose()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Wheel scrolling is the browser’s own: the old handler called
  // preventDefault + scrollBy({behavior: smooth}) per notch, which queued one
  // animation per event (that is what felt sticky and slow).
  // Peeking is suppressed while the list is moving, otherwise every row that
  // slides under the pointer would schedule a popover.
  const lastScrollAt = useRef(0)
  /** Play the leave animation before the panel is unmounted. */
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number | null>(null)
  const requestClose = (): void => {
    if (leaving) return
    setLeaving(true)
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = null
      props.onClose()
    }, 130)
  }
  useEffect(() => () => {
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current)
  }, [])
  const scrollSaveTimer = useRef<number | null>(null)

  return (
    <div
      className={`${styles['drawerBackdrop']}${leaving ? ` ${styles['drawerBackdropOut']}` : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
      // Also on click: a programmatic click (tests, keyboard-triggered close)
      // never sends mousedown, and a drawer that stays open eats every later
      // click on the board.
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        className={`${styles['drawer']}${leaving ? ` ${styles['drawerOut']}` : ''}`}
        role="dialog"
        aria-label={props.workspaceTitle}
      >
        <div className={styles['drawerHead']}>
          <span className={styles['drawerTitle']}>{props.workspaceTitle}</span>
          <span className={styles['drawerCount']}>{t('stack.total', { n: String(props.items.length) })}</span>
          <span className={styles['drawerSpace']} />
          <span className={styles['drawerHint']}>{t('stack.hint')}</span>
          <button
            type="button"
            className={styles['drawerClose']}
            title={t('stack.close')}
            aria-label={t('stack.close')}
            onClick={requestClose}
          >
            ×
          </button>
        </div>
        <div className={styles['drawerSearchRow']}>
          <input
            className={styles['drawerSearch']}
            value={query}
            placeholder={t('stack.searchPlaceholder')}
            aria-label={t('stack.searchPlaceholder')}
            data-talkmap-drawer-search=""
            onChange={(event) => {
              setQuery(event.target.value)
              // Clearing the box forgets the previous search, so the list goes
              // back to the whole folder without another request.
              if (event.target.value.trim() === '') { setHits([]); setSearchError(null) }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.stopPropagation(); return }
              if (event.key !== 'Enter') return
              event.preventDefault()
              void runSearch()
            }}
          />
          <button
            type="button"
            className={styles['drawerSearchGo']}
            data-talkmap-drawer-search-run=""
            onClick={() => { void runSearch() }}
          >
            {t('global.searchRun')}
          </button>
          {searching ? <span className={styles['drawerSearchState']}>{t('stack.searching')}</span> : null}
          {searchError !== null
            ? (
                <span className={styles['drawerSearchError']} title={searchError}>
                  {isIndexDisabled(searchError)
                    ? t('stack.searchDisabled')
                    : t('stack.searchFailed') + '：' + (searchError.length > 70 ? searchError.slice(0, 70) + '…' : searchError)}
                </span>
              )
            : null}
        </div>
        {searching ? <SearchLoading rows={2} /> : null}
        <div
          className={styles['drawerScroll']}
          ref={scrollerRef}
          onScroll={(event) => {
            lastScrollAt.current = Date.now()
            // Writing to localStorage on every scroll event is a big part of
            // the jank: remember the offset after the list settles instead.
            const scroller = event.currentTarget
            if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current)
            scrollSaveTimer.current = window.setTimeout(() => {
              scrollSaveTimer.current = null
              drawerState.writeScroll(scroller.scrollTop)
            }, 200)
          }}
        >
          {visibleItems.map(item => {
            const classNames = [styles['card'], styles['drawerCard']]
            if (item.glow !== undefined) classNames.push(styles[LAMP_CLASS[item.glow]] ?? '')
            // Same rule as the grid: a card with nothing to report recedes, one
            // that carries a status (lamp / unsent text / interrupted / pinned)
            // stays at full strength.
            const quiet = item.glow === undefined && item.pendingDraft !== true
              && item.interrupted !== true && item.pinned !== true
            if (quiet) classNames.push(styles['cardQuiet'] ?? '')
            if (item.selected === true) classNames.push(styles['cardSelected'] ?? '')
            return (
              <button
                key={item.cardId}
                type="button"
                data-stack-card=""
                data-talkmap-session={item.sessionId}
                className={classNames.filter(Boolean).join(' ')}
                onClick={() => { props.onOpenCard(item.cardId) }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  props.onCardMenu?.(item.cardId, event)
                }}
              >
                {item.current === true ? <span className={styles['cardReticle']}><i /><i /><i /><i /></span> : null}
                <div className={styles['cardTop']}>
                  {item.pinned === true
                    ? <span className={styles['cardPin']} title={t('card.pinned')} data-talkmap-pin="1"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M16 8.6V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v4.6c0 1.66-1.34 3-3 3v2h5.1v7.9l.9 1 .9-1V13.6H19v-2c-1.66 0-3-1.34-3-3z"/></svg></span>
                    : null}
                  <span className={styles['cardTitle']}>{item.title}</span>
                </div>
                {item.preview !== undefined && item.preview !== ''
                  ? <div className={styles['cardSummary']}>{item.preview}</div>
                  : null}
                <div className={styles['cardFooter']}>
                  <span className={styles['cardTime']}>{relativeTime(item.updatedAt)}</span>
                  {item.pendingDraft === true
                    ? (
                        <span
                          className={`${styles['cardChip']} ${styles['cardChipDraft']}`}
                          title={t('card.draftHint')}
                          data-talkmap-draft="1"
                        >
                          {t('card.draft')}
                        </span>
                      )
                    : null}
                  {item.interrupted === true
                    ? (
                        <span
                          className={`${styles['cardChip']} ${styles['cardChipInterrupted']}`}
                          title={t('card.interruptedHint')}
                          data-talkmap-interrupted="1"
                        >
                          {t('card.interrupted')}
                        </span>
                      )
                    : null}
                  {item.glow === undefined
                    ? null
                    : (
                        <span
                          className={`${styles['cardChip']} ${styles[LAMP_CHIP[item.glow].className]}`}
                          data-talkmap-chip={item.glow}
                        >
                          {item.glow === 'running' ? <span className={styles['runningDot']} /> : null}
                          {t(LAMP_CHIP[item.glow].key)}
                        </span>
                      )}
                </div>
              </button>
            )
          })}
          {hits.length > 0
            ? (
                <SearchResults
                  query={query}
                  storageScope={'drawer:' + props.groupId}
                  hits={hits}
                  searching={searching}
                  error={null}
                  heading={t('stack.contentHits', { n: String(hits.length) })}
                  onOpenSession={(sessionId, q) => { props.onOpenSession?.(sessionId, q) }}
                  onFetchContext={props.onFetchContext}
                  onFetchSessionHits={props.onFetchSessionHits}
                />
              )
            : null}
          {needle !== '' && visibleItems.length === 0
            ? <div className={styles['drawerEmpty']}>{t('stack.noTitleMatch')}</div>
            : null}
        </div>
      </div>
    </div>
  )
}
