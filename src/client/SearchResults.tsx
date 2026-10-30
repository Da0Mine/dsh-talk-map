/**
 * One local result list, shared by the header search and the stack drawer.
 *
 * Both searches filter what the map has already rendered (title + body text), so
 * there is nothing to fetch: no spinner, no skeleton, no "load more", no peek.
 * Matches are highlighted and clicking a row opens that conversation.
 */
import { renderMarkdownInline } from './markdown-inline.tsx'
import styles from './talk-map.module.css'

export interface SearchHitView {
  sessionId: string
  title: string
  /** Matched lines; empty for a title-only hit (the title row already shows it). */
  blocks: string[][]
  /** Matched by title rather than by body text. */
  byTitle?: boolean
  /** Sub-agent sessions carry this label. */
  agent?: 'main' | 'subagent'
}

export interface SearchResultsProps {
  query: string
  hits: SearchHitView[]
  heading: string
  /** Shown when the query matched nothing. */
  empty: string
  onOpenSession: (sessionId: string) => void
}

export function SearchResults(props: SearchResultsProps): React.JSX.Element {
  return (
    <div className={styles['drawerHits']} data-talkmap-local-results="">
      <div className={styles['drawerHitsHead']}>{props.heading}</div>
      {props.hits.length === 0
        ? <div className={styles['drawerEmpty']}>{props.empty}</div>
        : null}
      {props.hits.map(hit => (
        <div key={hit.sessionId} className={styles['drawerHit']} data-talkmap-search-hit={hit.sessionId}>
          <div className={styles['drawerHitHead']}>
            {hit.byTitle === true
              ? (
                  <span className={styles['drawerAgentChip']} data-talkmap-title-hit="1">
                    {props.heading === '' ? '' : '标题'}
                  </span>
                )
              : null}
            {hit.agent === 'subagent'
              ? <span className={styles['drawerAgentChip']} data-talkmap-agent="subagent">子</span>
              : null}
            <button
              type="button"
              className={styles['drawerHitTitle']}
              onClick={() => { props.onOpenSession(hit.sessionId) }}
            >
              {renderMarkdownInline(hit.title, props.query).nodes}
            </button>
          </div>
          {hit.blocks.map((block, index) => {
            const needle = props.query.trim().toLowerCase()
            const line = block.find(entry => entry.toLowerCase().includes(needle)) ?? block[0] ?? ''
            return (
              <button
                key={index}
                type="button"
                className={styles['drawerHitLine']}
                data-talkmap-search-line={hit.sessionId}
                onClick={() => { props.onOpenSession(hit.sessionId) }}
              >
                {renderMarkdownInline(line, props.query).nodes}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
