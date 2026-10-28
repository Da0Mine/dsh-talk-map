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

/** One full-text hit: which conversation, its title, and where it matched. */
export interface DrawerSearchHit {
  sessionId: string
  title: string
  snippet: string
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
  /** Open a session found by the content search (it may live in another folder). */
  onOpenSession?: (sessionId: string) => void
  onClose: () => void
}

export function StackDrawer(props: StackDrawerProps): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<DrawerSearchHit[]>([])
  const [searching, setSearching] = useState(false)

  // Title filter is instant; the content search is debounced and runs on the
  // Host (session/search), so it also covers conversations outside this folder.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2 || props.onSearchContent === undefined) {
      setHits([])
      setSearching(false)
      return
    }
    let alive = true
    setSearching(true)
    const timer = setTimeout(() => {
      void props.onSearchContent?.(trimmed)
        .then((found) => { if (alive) setHits(found) })
        .catch(() => { if (alive) setHits([]) })
        .finally(() => { if (alive) setSearching(false) })
    }, 300)
    return () => { alive = false; clearTimeout(timer) }
  }, [query, props.onSearchContent])

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
      props.onClose()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Wheel = page, not micro-scroll: one notch is one card. Registered natively
  // because React attaches wheel listeners passively, where preventDefault is a
  // no-op (and logs an error).
  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller === null) return
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      scroller.scrollBy({ top: event.deltaY >= 0 ? rowStep(scroller) : -rowStep(scroller), behavior: 'smooth' })
    }
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => { scroller.removeEventListener('wheel', onWheel) }
  }, [])

  return (
    <div
      className={styles['drawerBackdrop']}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose()
      }}
    >
      <div className={styles['drawer']} role="dialog" aria-label={props.workspaceTitle}>
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
            onClick={props.onClose}
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
            onChange={(event) => { setQuery(event.target.value) }}
            onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation() }}
          />
          {searching ? <span className={styles['drawerSearchState']}>{t('stack.searching')}</span> : null}
        </div>
        <div
          className={styles['drawerScroll']}
          ref={scrollerRef}
          onScroll={(event) => { drawerState.writeScroll(event.currentTarget.scrollTop) }}
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
          {needle !== '' && visibleItems.length === 0
            ? <div className={styles['drawerEmpty']}>{t('stack.noTitleMatch')}</div>
            : null}
          {hits.length > 0
            ? (
                <div className={styles['drawerHits']}>
                  <div className={styles['drawerHitsHead']}>
                    {t('stack.contentHits', { n: String(hits.length) })}
                  </div>
                  {hits.map(hit => (
                    <button
                      key={hit.sessionId}
                      type="button"
                      className={styles['drawerHit']}
                      data-talkmap-search-hit={hit.sessionId}
                      onClick={() => { props.onOpenSession?.(hit.sessionId) }}
                    >
                      <span className={styles['drawerHitTitle']}>{hit.title}</span>
                      <span className={styles['drawerHitSnippet']}>{hit.snippet}</span>
                    </button>
                  ))}
                </div>
              )
            : null}
        </div>
      </div>
    </div>
  )
}
