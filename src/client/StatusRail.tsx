/**
 * The status rail: a panel pinned to the left edge of the map that lists only the cards
 * which currently carry a lamp. Each entry is the same card the board draws — same width,
 * same look — stacked top to bottom.
 *
 * Kept behaviour: closed by default, opened from a frosted-glass handle that rides the
 * panel edge, slides in from beyond the left edge, a card whose lamp changes jumps to the
 * top, cards that settle disappear, open/closed and the manual order survive a restart.
 *
 * Dragging is pointer-based (not HTML5 DnD) so it can look like the board: the card you
 * pick up floats under the pointer while the other cards glide out of its way with a FLIP
 * animation, and dropping simply keeps the order you saw.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
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

interface DragState {
  cardId: string
  /** Pointer Y where the card was picked up. */
  startPointerY: number
  /** Card top at pickup, in panel coordinates (see beginDrag). */
  baseTop: number
  pointerY: number
  left: number
  width: number
}

const OPEN_KEY = 'dsh.talk-map.status-rail.open.v1'
const ORDER_KEY = 'dsh.talk-map.status-rail.order.v1'
const FLIP_MS = 180

const LAMP_CLASS: Record<StatusLamp, string> = {
  running: 'cardLampRunning',
  done: 'cardLampDone',
  error: 'cardLampError',
  waiting: 'cardLampWaiting',
}

let openState: boolean | undefined
const openListeners = new Set<() => void>()

function subscribeOpen(listener: () => void): () => void {
  openListeners.add(listener)
  return () => { openListeners.delete(listener) }
}

function openSnapshot(): boolean {
  if (openState === undefined) openState = readOpen()
  return openState
}

function setOpenState(next: boolean): void {
  openState = next
  writeOpen(next)
  for (const listener of openListeners) listener()
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
  const open = useSyncExternalStore(subscribeOpen, openSnapshot, openSnapshot)
  const [order, setOrder] = useState<string[]>(() => readOrder())
  const [drag, setDrag] = useState<DragState | null>(null)
  const seenRef = useRef(new Map<string, string>())
  const slotsRef = useRef(new Map<string, HTMLDivElement>())
  const panelRef = useRef<HTMLDivElement | null>(null)
  const prevTops = useRef(new Map<string, number>())
  const orderRef = useRef(order)
  orderRef.current = order

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

  // FLIP: after any reorder, put every surviving card back where it was and let it glide
  // to its new place — the "cards move out of the way" feel the board has.
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    for (const [cardId, element] of slotsRef.current) {
      const top = element.getBoundingClientRect().top
      next.set(cardId, top)
      if (drag !== null && drag.cardId === cardId) continue
      const before = prevTops.current.get(cardId)
      if (before === undefined || Math.abs(before - top) < 1) continue
      element.style.transition = 'none'
      element.style.transform = `translateY(${before - top}px)`
      requestAnimationFrame(() => {
        element.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
        element.style.transform = ''
      })
    }
    prevTops.current = next
  }, [order, drag === null])

  // Pointer-driven drag: the picked card floats under the pointer, the rest reorder live.
  useEffect(() => {
    if (drag === null) return
    const cardId = drag.cardId

    const indexUnder = (pointerY: number): number => {
      let best = 0
      let bestDistance = Number.POSITIVE_INFINITY
      const ids = orderRef.current
      for (let index = 0; index < ids.length; index += 1) {
        const element = slotsRef.current.get(ids[index]!)
        if (element === undefined) continue
        const rect = element.getBoundingClientRect()
        const distance = Math.abs(pointerY - (rect.top + rect.height / 2))
        if (distance < bestDistance) {
          bestDistance = distance
          best = index
        }
      }
      return best
    }

    const onMove = (event: PointerEvent): void => {
      setDrag(current => (current === null ? null : { ...current, pointerY: event.clientY }))
      const target = indexUnder(event.clientY)
      setOrder(current => {
        const from = current.indexOf(cardId)
        if (from < 0 || target < 0 || target >= current.length || from === target) return current
        const next = [...current]
        next.splice(from, 1)
        next.splice(target, 0, cardId)
        return next
      })
    }

    const onUp = (): void => {
      writeOrder(orderRef.current)
      prevTops.current.clear()
      setDrag(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag])

  const toggle = useCallback(() => {
    setOpenState(!openSnapshot())
  }, [])

  const beginDrag = useCallback((event: React.PointerEvent<HTMLDivElement>, cardId: string) => {
    if (event.button !== 0) return
    const element = slotsRef.current.get(cardId)
    if (element === undefined) return
    const rect = element.getBoundingClientRect()
    // The panel is transformed (it slides in), so a position:fixed child is laid out
    // against the panel, not the viewport. Store panel-relative coordinates and move by
    // the pointer delta — using viewport numbers made the card jump on pickup.
    const panelRect = panelRef.current?.getBoundingClientRect()
    event.preventDefault()
    setDrag({
      cardId,
      startPointerY: event.clientY,
      baseTop: rect.top - (panelRect?.top ?? 0),
      pointerY: event.clientY,
      left: rect.left - (panelRect?.left ?? 0),
      width: rect.width,
    })
  }, [])

  return (
    <div
      className={styles['statusRail']}
      data-open={open ? '1' : '0'}
      style={{ ['--rail-card-w' as string]: `${props.cardWidth}px` }}
    >
      <div className={styles['statusRailPanel']} aria-hidden={!open} ref={panelRef}>
        <div className={styles['statusRailHead']}>
          <span className={styles['statusRailTitle']}>{t('statusRail.title')}</span>
          <span className={styles['statusRailCount']}>{props.entries.length}</span>
        </div>
        <div className={styles['statusRailList']} role="list">
          {ordered.length === 0
            ? <div className={styles['statusRailEmpty']}>{t('statusRail.empty')}</div>
            : null}
          {ordered.map(entry => {
            const floating = drag !== null && drag.cardId === entry.cardId
            return (
              <div
                key={entry.cardId}
                role="listitem"
                ref={(element) => {
                  if (element === null) slotsRef.current.delete(entry.cardId)
                  else slotsRef.current.set(entry.cardId, element)
                }}
                className={`${styles['statusRailSlot']}${floating ? ` ${styles['statusRailSlotFloating']}` : ''}`}
                style={floating
                  ? {
                      position: 'fixed',
                      left: drag.left,
                      width: drag.width,
                      top: drag.baseTop + (drag.pointerY - drag.startPointerY),
                      zIndex: 20,
                    }
                  : undefined}
              >
                <div
                  className={`${styles['card']} ${styles[LAMP_CLASS[entry.lamp]] ?? ''} ${styles['statusRailCard']}${floating ? ` ${styles['statusRailCardDragging']}` : ''}`}
                  onPointerDown={(event) => { beginDrag(event, entry.cardId) }}
                  onClick={() => { if (drag === null) props.onFocus(entry.cardId) }}
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
            )
          })}
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
        <svg viewBox="0 0 12 24" width="13" height="26" aria-hidden="true">
          <rect x="1.4" y="1" width="2" height="22" rx="1" fill="currentColor" />
          <rect x="8.6" y="1" width="2" height="22" rx="1" fill="currentColor" />
        </svg>
        {props.entries.length > 0
          ? <span className={styles['statusRailTabCount']}>{props.entries.length}</span>
          : null}
      </button>
    </div>
  )
}
