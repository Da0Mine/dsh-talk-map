/**
 * The drawer behind a folder's stack cell: every conversation of that
 * workspace, at 1:1 size (224px wide — exactly what the map looks like at
 * 100% zoom), in a multi-column grid. The wheel pages one ROW at a time, like a
 * phone's app drawer.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { mapUi } from './map-state.ts'
import { t } from './i18n.ts'
import { relativeTime, LAMP_CHIP } from './SessionCard.tsx'
import type { CardGlow } from './SessionCard.tsx'
import { drawerState } from './drawer-state.ts'
import { loadSearch, saveSearch } from './search-store.ts'
import { SearchResults } from './SearchResults.tsx'
import { getSmoothStepPath, Position } from '@xyflow/react'
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
  /** Per-match author: your message or the agent's answer. */
  roles?: (string | null)[]
  /** This conversation matched by title rather than content. */
  byTitle?: boolean
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
  /** Connections to other cards of the same folder (injection direction). */
  links?: { toCardId: string; title: string; kind: string; outgoing: boolean }[]
}

/** One line to draw behind the drawer cards. */
/** One line to draw behind the drawer cards. */
export interface DrawerWire {
  from: string
  to: string
  /** False = the canvas draws nothing for this pair, so neither do we. */
  visible: boolean
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
  /**
   * Card-to-card links among these items, drawn behind the cards as glowing
   * lines — the drawer used to show nothing but text chips between rows.
   */
  links?: readonly DrawerWire[]
  /** A drag inside the drawer landed: `cardId` now sits at `index`. */
  onReorder?: (cardId: string, index: number) => void
  onClose: () => void
}

export function StackDrawer(props: StackDrawerProps): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  /** Measured connector lines: curved paths in scroller coordinates. */
  const [wires, setWires] = useState<{ d: string; ax: number; ay: number; angle: number }[]>([])
  const [wireSize, setWireSize] = useState({ width: 0, height: 0 })
  const remembered = loadSearch<DrawerSearchHit>('drawer:' + props.groupId)
  const [query, setQuery] = useState(remembered?.query ?? '')
  const [hits, setHits] = useState<DrawerSearchHit[]>(remembered?.hits ?? [])
  const [searching, setSearching] = useState(false)
  /** The card being dragged inside the drawer, and where it would land. */
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
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

  /**
   * Rebuild the connector paths whenever the layout can have changed: the item
   * list, the filter, a resize, or the font scale. Positions come from the real
   * DOM, so the lines always match what the user sees.
   */
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    // Synced pairs show no line at all, same as on the map.
    const links = (props.links ?? []).filter(link => link.visible)
    if (scroller === null || links.length === 0) {
      setWires(current => (current.length === 0 ? current : []))
      return
    }
    const measure = (): void => {
      const boxOf = (cardId: string): DOMRect | null => {
        const element = scroller.querySelector(`[data-card-id="${cardId}"]`)
        if (element === null) return null
        const rect = element.getBoundingClientRect()
        const base = scroller.getBoundingClientRect()
        return new DOMRect(
          rect.left - base.left + scroller.scrollLeft,
          rect.top - base.top + scroller.scrollTop,
          rect.width,
          rect.height,
        )
      }
      const next: { d: string; ax: number; ay: number; angle: number }[] = []
      for (const link of links) {
        const from = boxOf(link.from)
        const to = boxOf(link.to)
        if (from === null || to === null) continue
        const fromCx = from.x + from.width / 2
        const fromCy = from.y + from.height / 2
        const toCx = to.x + to.width / 2
        const toCy = to.y + to.height / 2
        const dx = toCx - fromCx
        const dy = toCy - fromCy
        // Same rule and the same geometry as the map: an orthogonal smoothstep
        // path (rounded right angles), not a bezier bow.
        const gapX = Math.abs(dx) - (from.width + to.width) / 2
        const gapY = Math.abs(dy) - (from.height + to.height) / 2
        const MIN_SPAN = 96
        const horizontalDominant = Math.abs(dx) >= Math.abs(dy)

        let sourceX = fromCx
        let sourceY = fromCy
        let targetX = toCx
        let targetY = toCy
        let sourcePosition = Position.Right
        let targetPosition = Position.Left

        if (horizontalDominant && gapX >= MIN_SPAN) {
          const right = dx >= 0
          sourceX = right ? from.x + from.width : from.x
          targetX = right ? to.x : to.x + to.width
          sourcePosition = right ? Position.Right : Position.Left
          targetPosition = right ? Position.Left : Position.Right
          targetY = toCy
        } else if (!horizontalDominant && gapY >= MIN_SPAN) {
          const down = dy >= 0
          sourceY = down ? from.y + from.height : from.y
          targetY = down ? to.y : to.y + to.height
          sourcePosition = down ? Position.Bottom : Position.Top
          targetPosition = down ? Position.Top : Position.Bottom
          targetX = toCx
        } else {
          // Too close: drop out of the bottom (or top) of both cards.
          const down = from.y + from.height <= to.y + to.height
          sourceY = down ? from.y + from.height : from.y
          targetY = down ? to.y + to.height : to.y
          sourcePosition = down ? Position.Bottom : Position.Top
          targetPosition = down ? Position.Bottom : Position.Top
        }

        const [wirePath] = getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: 8,
        })

        const angle = targetPosition === Position.Left ? 0
          : targetPosition === Position.Right ? 180
            : targetPosition === Position.Top ? 90
              : -90
        next.push({ d: wirePath, ax: targetX, ay: targetY, angle })
      }
      // Only touch state when something actually moved: the parent may
      // re-render for unrelated reasons, and a blind setState here loops.
      setWires((current) => {
        if (current.length === next.length && current.every((wire, index) => wire.d === next[index]?.d)) {
          return current
        }
        return next
      })
      const width = Math.round(scroller.scrollWidth)
      const height = Math.round(scroller.scrollHeight)
      setWireSize((current) => (
        current.width === width && current.height === height ? current : { width, height }
      ))
    }
    measure()
    const observer = new ResizeObserver(() => { measure() })
    observer.observe(scroller)
    return () => { observer.disconnect() }
  }, [props.links, props.items, query, visibleItems.length])
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

  /** Which slot the pointer is over, among the cards currently rendered. */
  const slotUnder = (clientX: number, clientY: number): number | null => {
    const scroller = scrollerRef.current
    if (scroller === null) return null
    const cards = [...scroller.querySelectorAll('[data-stack-card]')] as HTMLElement[]
    if (cards.length === 0) return null
    let best = 0
    let bestDistance = Number.POSITIVE_INFINITY
    cards.forEach((card, index) => {
      const box = card.getBoundingClientRect()
      const dx = clientX - (box.x + box.width / 2)
      const dy = clientY - (box.y + box.height / 2)
      // Rows matter more than columns: weight the vertical distance.
      const distance = dx * dx + dy * dy * 3
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    })
    return best
  }

  const endDrag = (): void => {
    setDragId(null)
    setDropIndex(null)
  }

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
          {wires.length > 0
            ? (
                <svg
                  className={styles['drawerWires']}
                  width={Math.max(1, wireSize.width)}
                  height={Math.max(1, wireSize.height)}
                  aria-hidden="true"
                >
                  {wires.map((wire, index) => (
                    <g key={index}>
                      <path
                        d={wire.d}
                        fill="none"
                        stroke="rgba(200, 206, 216, 0.42)"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        strokeDasharray="6 5"
                      />
                      <path
                        d="M0 0 L-9 -4 L-9 4 Z"
                        transform={`translate(${wire.ax} ${wire.ay}) rotate(${wire.angle})`}
                        fill="rgba(200, 206, 216, 0.5)"
                      />
                    </g>
                  ))}
                </svg>
              )
            : null}
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
                data-card-id={item.cardId}
                data-talkmap-session={item.sessionId}
                className={classNames.filter(Boolean).join(' ')}
                draggable
                data-talkmap-drag={dragId === item.cardId ? "1" : undefined}
                onDragStart={(event) => {
                  setDragId(item.cardId)
                  event.dataTransfer.effectAllowed = 'move'
                  // Firefox refuses to start a drag without payload.
                  event.dataTransfer.setData('text/plain', item.cardId)
                }}
                onDragOver={(event) => {
                  if (dragId === null) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  const index = slotUnder(event.clientX, event.clientY)
                  if (index !== null && index !== dropIndex) setDropIndex(index)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const index = dropIndex
                  const moving = dragId
                  endDrag()
                  if (moving === null || index === null) return
                  props.onReorder?.(moving, index)
                }}
                onDragEnd={endDrag}
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
                {item.links !== undefined && item.links.length > 0
                  ? (
                      <div className={styles['cardLinks']} data-talkmap-card-links={item.links.length}>
                        {item.links.slice(0, 3).map(link => (
                          <span
                            key={(link.outgoing ? 'out-' : 'in-') + link.toCardId}
                            className={styles['cardLinkChip']}
                            data-talkmap-link={link.outgoing ? 'out' : 'in'}
                            title={link.kind}
                          >
                            {link.outgoing ? '→ ' : '← '}{link.title}
                          </span>
                        ))}
                      </div>
                    )
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
                  hits={hits}
                  empty={t('map.noHit')}
                  onOpenSession={(sessionId) => { props.onOpenSession?.(sessionId) }}
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
