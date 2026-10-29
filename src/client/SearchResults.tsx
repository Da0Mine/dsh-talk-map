/**
 * The result list shared by both searches:
 *   • the stack drawer — scoped to ONE workspace (its folder)
 *   • the header search — global, every conversation
 *
 * One conversation is one section (agent badge + title), each match is one line,
 * hovering a line shows the whole passage in a floating box, and the rest of a
 * conversation's hits are one click away (that is what keeps a search to a
 * single corpus query).
 */
import { useEffect, useRef, useState } from 'react'
import { renderMarkdownInline } from './markdown-inline.tsx'
import { t } from './i18n.ts'
import styles from './talk-map.module.css'

export interface SearchHitView {
  sessionId: string
  title: string
  blocks: string[][]
  seqs?: (number | null)[]
  agent?: 'main' | 'subagent'
  depth?: number
}

/** Split `text` around every occurrence of `query` and mark the matches. */
export function highlight(text: string, query: string): React.ReactNode[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [text]
  const haystack = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let cursor = 0
  let key = 0
  while (cursor < text.length) {
    const at = haystack.indexOf(needle, cursor)
    if (at < 0) {
      parts.push(text.slice(cursor))
      break
    }
    if (at > cursor) parts.push(text.slice(cursor, at))
    parts.push(<mark key={key++} className={styles['hitMark']}>{text.slice(at, at + needle.length)}</mark>)
    cursor = at + needle.length
  }
  return parts
}

/** The Host answers this when the deployment turned the session index off. */
export function isIndexDisabled(message: string): boolean {
  return message.includes('search is disabled') || message.includes('SESSION_QUERY_SEARCH_DISABLED')
}

export interface SearchResultsProps {
  query: string
  hits: SearchHitView[]
  searching: boolean
  error: string | null
  heading: string
  onOpenSession: (sessionId: string) => void
  onFetchContext?: (sessionId: string, seq: number, query: string) => Promise<string[]>
  onFetchSessionHits?: (sessionId: string, query: string) => Promise<{ blocks: string[][]; seqs: (number | null)[] }>
}

export function SearchResults(props: SearchResultsProps): React.JSX.Element {
  const needle = props.query.trim().toLowerCase()
  const [peek, setPeek] = useState<{ title: string; lines: string[]; x: number; y: number } | null>(null)
  const peekTimer = useRef<number | null>(null)
  const lastScrollAt = useRef(0)
  const cache = useRef(new Map<string, string[]>())
  const [more, setMore] = useState<Record<string, { blocks: string[][]; seqs: (number | null)[] }>>({})
  const [loadingMore, setLoadingMore] = useState<string | null>(null)

  const cancelPeek = (): void => {
    if (peekTimer.current !== null) {
      window.clearTimeout(peekTimer.current)
      peekTimer.current = null
    }
    setPeek(null)
  }
  useEffect(() => cancelPeek, [])

  const schedulePeek = (hit: SearchHitView, block: string[], event: React.MouseEvent, seq?: number | null): void => {
    if (Date.now() - lastScrollAt.current < 220) return
    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const eventSeq = seq === undefined ? hit.seqs?.[0] : seq
    peekTimer.current = window.setTimeout(() => {
      peekTimer.current = null
      setPeek({ title: hit.title, lines: block, x: rect.left, y: rect.bottom + 6 })
      if (typeof eventSeq !== 'number' || props.onFetchContext === undefined) return
      const key = hit.sessionId + ':' + String(eventSeq)
      const remembered = cache.current.get(key)
      if (remembered !== undefined) {
        setPeek(current => (current === null ? current : { ...current, lines: remembered }))
        return
      }
      void props.onFetchContext(hit.sessionId, eventSeq, props.query).then((lines) => {
        if (lines.length === 0) return
        cache.current.set(key, lines)
        setPeek(current => (current === null ? current : { ...current, lines }))
      })
    }, 180)
  }

  const expandHits = async (hit: SearchHitView): Promise<void> => {
    if (props.onFetchSessionHits === undefined || loadingMore !== null) return
    setLoadingMore(hit.sessionId)
    try {
      const page = await props.onFetchSessionHits(hit.sessionId, props.query)
      setMore(previous => ({
        ...previous,
        [hit.sessionId]: page.blocks.length > 0 ? page : { blocks: hit.blocks, seqs: hit.seqs ?? [] },
      }))
    } finally {
      setLoadingMore(null)
    }
  }

  return (
    <div className={styles['drawerHits']}>
      <div className={styles['drawerHitsHead']}>
        {props.heading}
        {props.searching ? ' · ' + t('stack.searching') : ''}
      </div>
      {props.error !== null
        ? (
            <div className={styles['drawerSearchError']} title={props.error}>
              {isIndexDisabled(props.error)
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
            <button
              type="button"
              className={styles['drawerHitTitle']}
              onClick={() => { props.onOpenSession(hit.sessionId) }}
            >
              {highlight(hit.title, props.query)}
            </button>
            {blocks.map((block, index) => {
              const matched = block.find(line => line.toLowerCase().includes(needle)) ?? block[0] ?? ''
              return (
                <button
                  key={index}
                  type="button"
                  className={styles['drawerHitLine']}
                  data-talkmap-search-line={hit.sessionId}
                  onClick={() => { props.onOpenSession(hit.sessionId) }}
                  onMouseEnter={(event) => { schedulePeek(hit, block, event, seqs[index] ?? null) }}
                  onMouseLeave={cancelPeek}
                  onFocus={(event) => { schedulePeek(hit, block, event as unknown as React.MouseEvent, seqs[index] ?? null) }}
                  onBlur={cancelPeek}
                >
                  {renderMarkdownInline(matched, props.query).nodes}
                </button>
              )
            })}
            {props.onFetchSessionHits !== undefined && more[hit.sessionId] === undefined
              ? (
                  <button
                    type="button"
                    className={styles['drawerHitMore']}
                    data-talkmap-search-more={hit.sessionId}
                    onClick={() => { void expandHits(hit) }}
                  >
                    {loadingMore === hit.sessionId ? t('stack.moreLoading') : t('stack.moreHits')}
                  </button>
                )
              : null}
          </div>
        )
      })}
      {peek !== null
        ? (
            <div
              className={styles['peek']}
              data-talkmap-search-peek=""
              style={{
                left: Math.min(Math.max(12, peek.x), Math.max(12, window.innerWidth - 520)),
                top: Math.min(peek.y, Math.max(12, window.innerHeight - 220)),
              }}
              onMouseEnter={() => { if (peekTimer.current !== null) window.clearTimeout(peekTimer.current) }}
              onMouseLeave={cancelPeek}
            >
              <div className={styles['peekTitle']}>{peek.title}</div>
              {peek.lines.map((line, index) => (
                <div key={index} className={styles['peekLine']}>{renderMarkdownInline(line, props.query).nodes}</div>
              ))}
              <div className={styles['peekHint']}>{t('stack.peekHint')}</div>
            </div>
          )
        : null}
      <div
        className={styles['drawerScrollSensor']}
        ref={(node) => {
          if (node === null) return
          const scroller = node.parentElement
          if (scroller === null) return
          scroller.onscroll = () => { lastScrollAt.current = Date.now() }
        }}
      />
    </div>
  )
}
