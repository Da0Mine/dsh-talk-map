/**
 * The status rail: a left-edge drawer that lists only the cards which currently carry a
 * lamp (running / waiting / unread / interrupted). The list is derived from the live card
 * set, so a card whose status clears drops out on its own; a card whose status changes
 * jumps to the top. The user can drag rows into their own order, and the open/closed state
 * is remembered across restarts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from './i18n.ts'
import styles from './talk-map.module.css'

export type StatusLamp = 'running' | 'waiting' | 'done' | 'error'

export interface StatusRailEntry {
  cardId: string
  sessionId: string
  title: string
  lamp: StatusLamp
  /** Changes whenever the lamp or the session's stamp advances. */
  stamp: number
  updatedAt?: number
}

export interface StatusRailProps {
  entries: readonly StatusRailEntry[]
  onFocus: (cardId: string) => void
}

const OPEN_KEY = 'dsh.talk-map.status-rail.open.v1'
const ORDER_KEY = 'dsh.talk-map.status-rail.order.v1'

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
    /* a full or blocked store must not break the map */
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

function lampLabel(lamp: StatusLamp): string {
  return t(`statusRail.lamp.${lamp}`)
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
      if (before !== now) fresh.push(entry.cardId)
      seen.set(entry.cardId, now)
    }
    const alive = new Set(props.entries.map(entry => entry.cardId))
    setOrder((current) => {
      const kept = current.filter(cardId => alive.has(cardId))
      const next = [...fresh.filter(cardId => alive.has(cardId)).reverse(), ...kept]
      // Cards that appeared without a "change" (first paint) keep their incoming order.
      for (const entry of props.entries) {
        if (!next.includes(entry.cardId)) next.push(entry.cardId)
      }
      const deduped = [...new Set(next)]
      if (deduped.length === kept.length && deduped.every((cardId, index) => cardId === kept[index])) return kept
      writeOrder(deduped)
      return deduped
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
      const alive = current.filter(cardId => cardId !== from)
      const at = alive.indexOf(to)
      if (at < 0) return current
      const next = [...alive.slice(0, at), from, ...alive.slice(at)]
      writeOrder(next)
      return next
    })
  }, [])

  const count = props.entries.length

  return (
    <div className={`${styles['statusRail']}${open ? ` ${styles['statusRailOpen']}` : ''}`}>
      <button
        type="button"
        className={styles['statusRailTab']}
        aria-expanded={open}
        aria-label={open ? t('statusRail.close') : t('statusRail.open')}
        title={open ? t('statusRail.close') : t('statusRail.open')}
        onClick={toggle}
      >
        <span className={styles['statusRailTabIcon']} aria-hidden="true">◧</span>
        {count > 0 ? <span className={styles['statusRailTabCount']}>{count}</span> : null}
      </button>
      {open
        ? (
          <div className={styles['statusRailPanel']} role="list">
            <div className={styles['statusRailHead']}>
              <span className={styles['statusRailTitle']}>{t('statusRail.title')}</span>
              <button
                type="button"
                className={styles['statusRailClose']}
                aria-label={t('statusRail.close')}
                onClick={toggle}
              >
                ×
              </button>
            </div>
            {ordered.length === 0
              ? <div className={styles['statusRailEmpty']}>{t('statusRail.empty')}</div>
              : null}
            {ordered.map(entry => (
              <div
                key={entry.cardId}
                role="listitem"
                className={styles['statusRailRow']}
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
                onClick={() => { props.onFocus(entry.cardId) }}
                title={entry.title}
              >
                <span className={`${styles['statusRailLamp']} ${styles[`statusRailLamp_${entry.lamp}`] ?? ''}`} aria-hidden="true" />
                <span className={styles['statusRailRowTitle']}>{entry.title}</span>
                <span className={styles['statusRailRowLamp']}>{lampLabel(entry.lamp)}</span>
              </div>
            ))}
          </div>
        )
        : null}
    </div>
  )
}
