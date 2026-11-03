/**
 * The status rail: a panel pinned to the left edge of the map that lists only the cards
 * which currently carry a lamp (running / waiting / unread / interrupted). Each entry is
 * the same card the board draws — same width, same look — stacked top to bottom.
 *
 * Behaviour asked for and kept here:
 *   • closed by default, opened from a tab that overlaps the panel a little;
 *   • slides in from beyond the left edge with an eased transition;
 *   • a card whose lamp changes jumps to the top; the user can drag rows to reorder;
 *   • a card that stops carrying a lamp disappears (the list is derived from the board);
 *   • open/closed and the manual order survive a restart.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { relativeTime, LAMP_CHIP, type CardGlow } from './SessionCard.tsx'
import { t } from './i18n.ts'
import styles from './talk-map.module.css'

export type StatusLamp = CardGlow

export interface StatusRailEntry {
  cardId: string
  sessionId: string
  title: string
  lamp: StatusLamp
  /** Changes whenever the lamp or the session's stamp advances. */
  stamp: number
  updatedAt?: number
  preview?: string
  pinned?: boolean
}

export interface StatusRailProps {
  entries: readonly StatusRailEntry[]
  /** The board's card width, so a rail card is exactly as wide as a map card. */
  cardWidth: number
  onFocus: (cardId: string) => void
}

const OPEN_KEY = 'dsh.talk-map.status-rail.open.v1'
const ORDER_KEY = 'dsh.talk-map.status-rail.order.v1'

const LAMP_CLASS: Record<StatusLamp, string> = {
  running: 'cardLampRunning',
  done: 'cardLampDone',
  error: 'cardLampError',
  waiting: 'cardLampWaiting',
}

function readOpen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeOpen(open: boolean): void {
  try {
    window.localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    /* a blocked store must not break the map */
  }
}

function readOrder(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ORDER_KEY)
    const parsed = raw === null ? [] : JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeOrder(order: readonly string[]): void {
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

export function StatusRail(props: StatusRailProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(() => readOpen())
  const [order, setOrder] = useState<string[]>(() => readOrder())
  const seenRef = useRef(new Map<string, string>())
  const dragFrom = useRef<string | null>(null)

  const signature = useMemo(
    () => props.entries.map(entry => `${entry.cardId}:${entry.lamp}:${entry.stamp}`).join('|'),
    [props.entries],
  )

  // A card that just changed its lamp (or advanced its stamp) goes to the top; rows for
  // cards that no longer carry a lamp are dropped.
  useEffect(() => {
    const seen = seenRef.current
    const fresh: string[] = []
    for (const entry of props.entries) {
      const before = seen.get(entry.cardId)
      const now = `${entry.lamp}:${entry.stamp}`
      if (before !== undefined && before !== now) fresh.push(entry.cardId)
      seen.set(entry.cardId, now)
    }
    const alive = new Set(props.entries.map(entry => entry.cardId))
    setOrder((current) => {
      const kept = current.filter(cardId => alive.has(cardId))
      const next = [...new Set([...fresh.reverse(), ...kept])]
      for (const entry of props.entries) {
        if (!next.includes(entry.cardId)) next.push(entry.cardId)
      }
      if (next.length === kept.length && next.every((cardId, index) => cardId === kept[index])) return kept
      writeOrder(next)
      return next
    })
    for (const cardId of [...seen.keys()]) {
      if (!alive.has(cardId)) seen.delete(cardId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const ordered = useMemo(() => {
    const byId = new Map(props.entries.map(entry => [entry.cardId, entry]))
    const rows: StatusRailEntry[] = []
    for (const cardId of order) {
      const entry = byId.get(cardId)
      if (entry !== undefined) rows.push(entry)
    }
    for (const entry of props.entries) {
      if (!order.includes(entry.cardId)) rows.push(entry)
    }
    return rows
  }, [order, props.entries])

  const toggle = useCallback(() => {
    setOpen((current) => {
      writeOpen(!current)
      return !current
    })
  }, [])

  const move = useCallback((from: string, to: string) => {
    if (from === to) return
    setOrder((current) => {
      const rest = current.filter(cardId => cardId !== from)
      const at = rest.indexOf(to)
      if (at < 0) return current
      const next = [...rest.slice(0, at), from, ...rest.slice(at)]
      writeOrder(next)
      return next
    })
  }, [])

  return (
    <div
      className={`${styles['statusRail']}${open ? ` ${styles['statusRailOpen']}` : ''}`}
      style={{ ['--rail-card-w' as string]: `${props.cardWidth}px` }}
    >
      <div className={styles['statusRailPanel']} aria-hidden={!open}>
        <div className={styles['statusRailHead']}>
          <span className={styles['statusRailTitle']}>{t('statusRail.title')}</span>
          <span className={styles['statusRailCount']}>{props.entries.length}</span>
        </div>
        <div className={styles['statusRailList']} role="list">
          {ordered.length === 0
            ? <div className={styles['statusRailEmpty']}>{t('statusRail.empty')}</div>
            : null}
          {ordered.map(entry => (
            <div
              key={entry.cardId}
              role="listitem"
              className={styles['statusRailSlot']}
              draggable
              onDragStart={(event) => {
                dragFrom.current = entry.cardId
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', entry.cardId)
              }}
              onDragOver={(event) => {
                if (dragFrom.current === null) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const from = dragFrom.current ?? event.dataTransfer.getData('text/plain')
                dragFrom.current = null
                if (from !== '') move(from, entry.cardId)
              }}
              onDragEnd={() => { dragFrom.current = null }}
            >
              {/* The same card the board draws: same classes, same width, same lamp. */}
              <div
                className={`${styles['card']} ${styles[LAMP_CLASS[entry.lamp]] ?? ''} ${styles['statusRailCard']}`}
                onClick={() => { props.onFocus(entry.cardId) }}
                title={entry.title}
              >
                <div className={styles['cardTop']}>
                  <span className={styles['cardTitle']}>{entry.title}</span>
                </div>
                {entry.preview !== undefined && entry.preview !== ''
                  ? <div className={styles['cardSummary']}>{entry.preview}</div>
                  : null}
                <div className={styles['cardFooter']}>
                  <span className={styles['cardTime']}>{relativeTime(entry.updatedAt)}</span>
                  <span className={`${styles['cardChip']} ${styles[LAMP_CHIP[entry.lamp].className]}`}>
                    {LAMP_CHIP[entry.lamp].dot ? <span className={styles['runningDot']} /> : null}
                    {t(LAMP_CHIP[entry.lamp].key)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={styles['statusRailTab']}
        aria-expanded={open}
        aria-label={open ? t('statusRail.close') : t('statusRail.open')}
        title={open ? t('statusRail.close') : t('statusRail.open')}
        onClick={toggle}
      >
        {/* Two vertical bars: the rail is a column of cards. */}
        <svg viewBox="0 0 12 14" width="12" height="14" aria-hidden="true">
          <rect x="1.6" y="1.5" width="2.1" height="11" rx="1.05" fill="currentColor" />
          <rect x="8.3" y="1.5" width="2.1" height="11" rx="1.05" fill="currentColor" />
        </svg>
        {props.entries.length > 0
          ? <span className={styles['statusRailTabCount']}>{props.entries.length}</span>
          : null}
      </button>
    </div>
  )
}
