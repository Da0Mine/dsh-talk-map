/**
 * The result list shared by both searches:
 *   • the stack drawer — scoped to ONE workspace (its folder)
 *   • the header search — global, every conversation
 *
 * One conversation is one section; every match inside it is listed right away
 * (the extra hits are fetched in the background, no "more" button). Hovering a
 * line shows the whole passage in a floating box — rendered into <body> so a
 * transformed ancestor cannot shift it away from the pointer.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { renderMarkdownInline } from './markdown-inline.tsx'
import { SearchLoading } from './SearchLoading.tsx'
import { t } from './i18n.ts'
import styles from './talk-map.module.css'

export interface SearchHitView {
  sessionId: string
  title: string
  blocks: string[][]
  seqs?: (number | null)[]
  /** Sub-agent sessions are labelled; ordinary ones are not. */
  agent?: 'main' | 'subagent'
  depth?: number
}

export interface SearchResultsProps {
  query: string
  hits: SearchHitView[]
  searching: boolean
  error: string | null
  heading: string
  /** `q` is the searched text: the caller flashes it after the jump. */
  onOpenSession: (sessionId: string, q?: string) => void
  onFetchContext?: (sessionId: string, seq: number, query: string) => Promise<string[]>
  /** Every hit inside one conversation: fetched automatically after the first paint. */
  onFetchSessionHits?: (sessionId: string, query: string) => Promise<{ blocks: string[][]; seqs: (number | null)[] }>
}

/** Cursor-anchored, viewport-clamped position for the floating passage. */
function place(x: number, y: number): { left: number; top: number } {
  const width = Math.min(560, window.innerWidth - 24)
  const left = Math.min(Math.max(12, x + 14), Math.max(12, window.innerWidth - width - 12))
  const estimated = 260
  const top = y + estimated > window.innerHeight ? Math.max(12, y - estimated) : y + 14
  return { left, top }
}

export function SearchResults(props: SearchResultsProps): React.JSX.Element {
  const [peek, setPeek] = useState<{ title: string; lines: string[]; x: number; y: number } | null>(null)
  const peekTimer = useRef<number | null>(null)
  const cache = useRef(new Map<string, string[]>())
  const [more, setMore] = useState<Record<string, { blocks: string[][]; seqs: (number | null)[] }>>({})
  /** Sessions whose extra hits are still being fetched. */
  const [pending, setPending] = useState<Record<string, true>>({})

  const cancelPeek = (): void => {
    if (peekTimer.current !== null) {
      window.clearTimeout(peekTimer.current)
      peekTimer.current = null
    }
    setPeek(null)
  }
  useEffect(() => cancelPeek, [])

  // Every match of a conversation, loaded once, in the background.
  useEffect(() => {
    if (props.onFetchSessionHits === undefined) return
    let alive = true
    for (const hit of props.hits.slice(0, 5)) {
      if (more[hit.sessionId] !== undefined) continue
      setPending(previous => (previous[hit.sessionId] === true ? previous : { ...previous, [hit.sessionId]: true }))
      void props.onFetchSessionHits(hit.sessionId, props.query).then((page) => {
        if (!alive) return
        if (page.blocks.length > 1) {
          setMore(previous => (previous[hit.sessionId] === undefined ? { ...previous, [hit.sessionId]: page } : previous))
        }
      }).catch(() => {}).finally(() => {
        if (!alive) return
        setPending(previous => {
          if (previous[hit.sessionId] !== true) return previous
          const next = { ...previous }
          delete next[hit.sessionId]
          return next
        })
      })
    }
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.hits, props.query, props.onFetchSessionHits])

  const schedulePeek = (hit: SearchHitView, block: string[], event: React.MouseEvent, seq?: number | null): void => {
    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)
    const { clientX, clientY } = event
    peekTimer.current = window.setTimeout(() => {
      peekTimer.current = null
      setPeek({ title: hit.title, lines: block, x: clientX, y: clientY })
      if (typeof seq !== 'number' || props.onFetchContext === undefined) return
      const key = hit.sessionId + ':' + String(seq)
      const remembered = cache.current.get(key)
      if (remembered !== undefined) {
        setPeek(current => (current === null ? current : { ...current, lines: remembered }))
        return
      }
      void props.onFetchContext(hit.sessionId, seq, props.query).then((lines) => {
        if (lines.length === 0) return
        // Never swap in a passage that does not contain the searched word: a
        // stale seq used to show an unrelated paragraph.
        const needle = props.query.trim().toLowerCase()
        if (!lines.some(line => line.toLowerCase().includes(needle))) return
        cache.current.set(key, lines)
        setPeek(current => (current === null ? current : { ...current, lines }))
      })
    }, 170)
  }

  return (
    <div className={styles['drawerHits']}>
      <div className={styles['drawerHitsHead']}>
        {props.searching ? t('stack.searching') : props.heading}
      </div>
      {props.searching ? <SearchLoading rows={2} /> : null}
      {props.error !== null
        ? (
            <div className={styles['drawerSearchError']} title={props.error}>
              {props.error.includes('search is disabled') || props.error.includes('SESSION_QUERY_SEARCH_DISABLED')
                ? t('stack.searchDisabled')
                : t('stack.searchFailed') + '：' + (props.error.length > 70 ? props.error.slice(0, 70) + '…' : props.error)}
            </div>
          )
        : null}
      {props.hits.map(hit => {
        const blocks = more[hit.sessionId]?.blocks ?? hit.blocks
        const seqs = more[hit.sessionId]?.seqs ?? hit.seqs ?? []
        return (
          <div key={hit.sessionId} className={styles['drawerHit']} data-talkmap-search-hit={hit.sessionId}>
            <div className={styles['drawerHitHead']}>
              {hit.agent === 'subagent'
                ? (
                    <span
                      className={`${styles['drawerAgentChip']} ${styles['drawerAgentChipSub']}`}
                      data-talkmap-agent="subagent"
                      title={t('stack.agentSubHint')}
                    >
                      {t('stack.agentSub')}
                    </span>
                  )
                : null}
              <button
                type="button"
                className={styles['drawerHitTitle']}
                onClick={() => { props.onOpenSession(hit.sessionId, props.query) }}
              >
                {renderMarkdownInline(hit.title, props.query).nodes}
              </button>
            </div>
            {pending[hit.sessionId] === true
              ? (
                  <div className={styles['searchInlineLoading']} data-talkmap-search-pending={hit.sessionId}>
                    <span className={styles['searchSkeletonLine']} />
                  </div>
                )
              : null}
            {blocks.map((block, index) => {
              const needle = props.query.trim().toLowerCase()
              const line = block.find(entry => entry.toLowerCase().includes(needle)) ?? block[0] ?? ''
              return (
                <button
                  key={index}
                  type="button"
                  className={styles['drawerHitLine']}
                  data-talkmap-search-line={hit.sessionId}
                  onClick={() => { props.onOpenSession(hit.sessionId, props.query) }}
                  onMouseEnter={(event) => { schedulePeek(hit, block, event, seqs[index] ?? null) }}
                  onMouseLeave={cancelPeek}
                  onFocus={(event) => { schedulePeek(hit, block, event as unknown as React.MouseEvent, seqs[index] ?? null) }}
                  onBlur={cancelPeek}
                >
                  {renderMarkdownInline(line, props.query).nodes}
                </button>
              )
            })}
          </div>
        )
      })}
      {peek !== null
        ? createPortal(
            <div
              className={styles['peek']}
              data-talkmap-search-peek=""
              style={place(peek.x, peek.y)}
              onMouseEnter={() => { if (peekTimer.current !== null) window.clearTimeout(peekTimer.current) }}
              onMouseLeave={cancelPeek}
            >
              <div className={styles['peekTitle']}>{peek.title}</div>
              {peek.lines.map((line, index) => (
                <div key={index} className={styles['peekLine']}>{renderMarkdownInline(line, props.query).nodes}</div>
              ))}
              <div className={styles['peekHint']}>{t('stack.peekHint')}</div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
