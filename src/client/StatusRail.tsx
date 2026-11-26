/**
 * The status rail: a panel pinned to the left edge of the map that lists only the cards
 * which currently carry a lamp. Each entry is the same card the board draws — same width,
 * same look — stacked top to bottom.
 *
 * Behaviour: closed by default; a frosted handle (two bars + two dots) rides the panel
 * edge; the panel slides in from beyond the left edge; a card whose lamp changes jumps to
 * the top; cards that settle disappear; open/closed and the manual order survive a restart.
 *
 * Dragging keeps the picked card's slot in place (invisible) so the column cannot collapse,
 * floats a copy under the pointer, and slides the cards between the old and the new index
 * out of the way — both directions, which is what makes the column read as "making room".
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { installLiquidGlass } from './liquid-glass.ts'
import { useReorder } from './reorder.ts'
import { RailCardMenu, type RailMenuTarget } from './rail-menu.tsx'
import { relativeTime, LAMP_CHIP, type CardGlow } from './SessionCard.tsx'
import { t } from './i18n.ts'
import { sortQueueRows } from './queue-order.ts'
import styles from './talk-map.module.css'

export type StatusLamp = CardGlow

export interface StatusRailEntry {
  cardId: string
  sessionId: string
  title: string
  /** Absent for a draft-only card: it has unsent text but no lamp right now. */
  lamp?: StatusLamp
  /** Changes whenever the lamp or the session's stamp advances. */
  stamp: number
  updatedAt?: number
  preview?: string
  pinned?: boolean
  /** Has unsent text (shown as the 待发送 chip when there is no lamp). */
  draft?: boolean
}

export interface StatusRailProps {
  entries: readonly StatusRailEntry[]
  /** The board's card width, so a rail card is exactly as wide as a map card. */
  cardWidth: number
  /** Double click: select the card and centre the map on it. */
  onFocus: (cardId: string) => void
  /** Single click: open that conversation. */
  onOpen: (cardId: string) => void
  /** Cards with no lamp and no draft, newest first — the「最近的任务」section at the bottom. */
  recent?: readonly StatusRailEntry[]
  /** The conversation on screen right now: it gets the corner brackets. */
  currentSessionId?: string
  /** Pinned sessions, so the card menu can show 置顶 / 取消置顶. */
  pinned?: ReadonlySet<string>
}

interface DragState {
  cardId: string
  /** Where the card came from, in the visible order. */
  origin: number
  /** Where it would land if dropped now. */
  hover: number
  /** One row (card height + gap). */
  step: number
  startPointerY: number
  pointerY: number
  /** Panel-relative geometry of the floating copy. */
  left: number
  baseTop: number
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

function readOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(OPEN_KEY)
    // No stored choice yet: keep the queue board open. It used to start collapsed, which left
    // nothing but a transparent handle on screen and read as "the board is gone".
    return stored === null ? true : stored === '1'
  } catch {
    return true
  }
}

function writeOpen(open: boolean): void {
  try {
    window.localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    /* a blocked store must not break the map */
  }
}

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

  // Real refraction on the panel: the backdrop is bent along the bezel by an SVG
  // displacement filter (ported from EchoMusic's echo-liquid-glass).
  useEffect(() => {
    const element = panelRef.current
    if (element === null) return undefined
    // Plugin defaults are thickness 100 / bezel 40 / ior 2.5 / specular 0.5. Widened here:
    // a thicker slab and a 60px bezel push the bent band further into the surface.
    return installLiquidGlass(element, { thickness: 160, bezelWidth: 60, ior: 2.6, specularOpacity: 0.6, scale: 96 })
  }, [])

  // The handle runs the plugin's own recipe with the panel's values — no blur, no fill.
  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element)
  }, [])




  const [order, setOrder] = useState<string[]>(() => readOrder())
  /** Order of the「最近的任务」strip; independent from the queue's own order. */
  const [recentOrder, setRecentOrder] = useState<string[]>([])
  const [menu, setMenu] = useState<RailMenuTarget | null>(null)
  const recentIds = (props.recent ?? []).map(entry => entry.cardId)
  useEffect(() => {
    setRecentOrder(current => {
      const kept = current.filter(id => recentIds.includes(id))
      const added = recentIds.filter(id => !kept.includes(id))
      const next = [...kept, ...added]
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentIds.join('|')])
  const recentDrag = useReorder(recentIds, setRecentOrder)
  const recentEntriesOrdered = useMemo(() => {
    const byId = new Map((props.recent ?? []).map(entry => [entry.cardId, entry]))
    const ordered = recentOrder.map(id => byId.get(id)).filter((entry): entry is StatusRailEntry => entry !== undefined)
    // Anything the sync effect has not seen yet still shows up, at the end.
    for (const entry of props.recent ?? []) {
      if (!recentOrder.includes(entry.cardId)) ordered.push(entry)
    }
    return ordered
  }, [props.recent, recentOrder])
  const [drag, setDrag] = useState<DragState | null>(null)
  const [shift, setShift] = useState<Record<string, number>>({})
  const seenRef = useRef(new Map<string, string>())
  const slotsRef = useRef(new Map<string, HTMLDivElement>())
  const prevTops = useRef(new Map<string, number>())
  const panelRef = useRef<HTMLDivElement | null>(null)
  const tabRef = useRef<HTMLButtonElement | null>(null)

  const orderRef = useRef(order)
  orderRef.current = order
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  /** Did this press travel far enough to count as a drag? */
  const movedRef = useRef(false)
  /** Single click is delayed so a double click can cancel it. */
  const clickTimer = useRef<number | null>(null)
  const lastTap = useRef<{ cardId: string; at: number } | null>(null)

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
    // Drag position only orders cards inside their own priority bucket.
    const manualIndex = (cardId: string): number => {
      const index = order.indexOf(cardId)
      return index < 0 ? Number.MAX_SAFE_INTEGER : index
    }
    return sortQueueRows(props.entries.map(entry => ({
      ...entry,
      manualIndex: manualIndex(entry.cardId),
    })))
  }, [order, props.entries])

  // FLIP for status-driven moves; dragging has its own gap logic below.
  useLayoutEffect(() => {
    if (drag !== null) return
    const next = new Map<string, number>()
    const deltas: Record<string, number> = {}
    for (const [cardId, element] of slotsRef.current) {
      const top = element.getBoundingClientRect().top
      next.set(cardId, top)
      const before = prevTops.current.get(cardId)
      if (before === undefined || Math.abs(before - top) < 1) continue
      deltas[cardId] = before - top
    }
    prevTops.current = next
    if (Object.keys(deltas).length === 0) return
    setShift(deltas)
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => { setShift({}) })
    })
    return () => {
      cancelAnimationFrame(outer)
      if (inner !== 0) cancelAnimationFrame(inner)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, drag === null])

  // Pointer drag: pick the row, follow the pointer, open a gap both ways, commit on drop.
  useEffect(() => {
    if (drag === null) return
    const { cardId } = drag

    const indexUnder = (pointerY: number): number => {
      const ids = orderRef.current
      let best = 0
      let bestDistance = Number.POSITIVE_INFINITY
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
      const startY = dragRef.current?.startPointerY
      if (startY !== undefined && Math.abs(event.clientY - startY) > 4) movedRef.current = true
      const hover = indexUnder(event.clientY)
      setDrag(current => (current === null
        ? null
        : { ...current, pointerY: event.clientY, hover }))
    }

    const onUp = (): void => {
      const current = dragRef.current
      // Press without travel is a tap: one tap opens the conversation, a quick second
      // tap (double click) locates the card on the map instead.
      if (current !== null && movedRef.current === false) {
        const cardId = current.cardId
        prevTops.current.clear()
        setDrag(null)
        const now = Date.now()
        const previous = lastTap.current
        if (previous !== null && previous.cardId === cardId && now - previous.at < 320) {
          lastTap.current = null
          if (clickTimer.current !== null) {
            window.clearTimeout(clickTimer.current)
            clickTimer.current = null
          }
          props.onFocus(cardId)
          return
        }
        lastTap.current = { cardId, at: now }
        if (clickTimer.current !== null) window.clearTimeout(clickTimer.current)
        clickTimer.current = window.setTimeout(() => {
          clickTimer.current = null
          lastTap.current = null
          props.onOpen(cardId)
        }, 240)
        return
      }
      if (current !== null && current.hover !== current.origin) {
        setOrder(existing => {
          const from = existing.indexOf(current.cardId)
          if (from < 0) return existing
          const next = [...existing]
          next.splice(from, 1)
          const to = Math.min(Math.max(current.hover, 0), next.length)
          next.splice(to, 0, current.cardId)
          writeOrder(next)
          return next
        })
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag === null])

  const toggle = useCallback(() => {
    setOpenState(!openSnapshot())
  }, [])

  const beginDrag = useCallback((event: React.PointerEvent<HTMLDivElement>, cardId: string) => {
    if (event.button !== 0) return
    const element = slotsRef.current.get(cardId)
    if (element === undefined) return
    const rect = element.getBoundingClientRect()
    // The floating copy is a direct child of .statusRail (outside the transformed panel),
    // so position:fixed there is viewport-relative — use viewport numbers, not panel ones.
    event.preventDefault()
    const index = Math.max(0, orderRef.current.indexOf(cardId))
    movedRef.current = false
    setDrag({
      cardId,
      origin: index,
      hover: index,
      step: rect.height + 10,
      startPointerY: event.clientY,
      pointerY: event.clientY,
      left: rect.left,
      baseTop: rect.top,
      width: rect.width,
    })
  }, [])

  const renderCard = (
    entry: StatusRailEntry,
    floating: boolean,
    interactive = true,
    pointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void,
  ): React.JSX.Element => (
    <div
      className={`${styles['card']} ${entry.lamp === undefined ? '' : styles[LAMP_CLASS[entry.lamp]] ?? ''} ${styles['statusRailCard']}${floating ? ` ${styles['statusRailCardDragging']}` : ''}`}
      onPointerDown={floating || !interactive ? pointerDown : (event) => { beginDrag(event, entry.cardId) }}
      {...(interactive ? {} : { onClick: () => { props.onOpen(entry.cardId) } })}
      onContextMenu={(event) => {
        event.preventDefault()
        setMenu({
          sessionId: entry.sessionId,
          title: entry.title,
          pinned: props.pinned?.has(entry.sessionId) === true,
          x: event.clientX,
          y: event.clientY,
        })
      }}
      title={entry.title}
    >
      {props.currentSessionId !== undefined && entry.sessionId === props.currentSessionId
        ? <span className={styles['cardReticle']} aria-hidden="true"><i /><i /><i /><i /></span>
        : null}
      <div className={styles['cardTop']}>
        <span className={styles['cardTitle']}>{entry.title}</span>
      </div>
      {entry.preview !== undefined && entry.preview !== ''
        ? <div className={styles['cardSummary']}>{entry.preview}</div>
        : null}
      <div className={styles['cardFooter']}>
        <span className={styles['cardTime']}>{relativeTime(entry.updatedAt)}</span>
                {/* Unsent text is independent of the lamp: show it next to the status chip. */}
                {entry.draft === true
                  ? <span className={`${styles['cardChip']} ${styles['cardChipDraft']}`}>{t('card.draft')}</span>
                  : null}
                {entry.lamp === undefined
                  ? null
                  : (
                    <span className={`${styles['cardChip']} ${styles[LAMP_CHIP[entry.lamp].className]}`}>
                      {LAMP_CHIP[entry.lamp].dot ? <span className={styles['runningDot']} /> : null}
                      {t(LAMP_CHIP[entry.lamp].key)}
                    </span>
                  )}
      </div>
    </div>
  )

  const floatingEntry = drag === null ? undefined : ordered.find(entry => entry.cardId === drag.cardId)

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
          {ordered.map((entry, index) => {
            const dragging = drag !== null && drag.cardId === entry.cardId
            // Cards between the old and the new index slide one row out of the way; the
            // picked card's own slot stays in flow (hidden) so the column keeps its height.
            let moved = 0
            if (drag !== null && !dragging) {
              if (drag.hover > drag.origin && index > drag.origin && index <= drag.hover) moved = -drag.step
              else if (drag.hover < drag.origin && index >= drag.hover && index < drag.origin) moved = drag.step
            }
            const style = drag !== null
              ? { transform: `translateY(${moved}px)`, transition: `transform ${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` }
              : shift[entry.cardId] !== undefined
                ? { transform: `translateY(${shift[entry.cardId]}px)`, transition: 'none' }
                : { transition: `transform ${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` }
            return (
              <div
                key={entry.cardId}
                role="listitem"
                ref={(element) => {
                  if (element === null) slotsRef.current.delete(entry.cardId)
                  else slotsRef.current.set(entry.cardId, element)
                }}
                className={styles['statusRailSlot']}
                style={style}
              >
                {dragging
                  ? <div className={styles['statusRailGhost']}>{renderCard(entry, false)}</div>
                  : renderCard(entry, false)}
              </div>
            )
          })}
          {props.recent !== undefined && props.recent.length > 0
            ? (
              <>
                <div className={styles['statusRailRecentHead']}>{t('statusRail.recent')}</div>
                {recentEntriesOrdered.map(entry => {
                  const dragging = recentDrag.draggingId === entry.cardId
                  return (
                    <div
                      key={entry.cardId}
                      ref={element => { recentDrag.register(entry.cardId, element) }}
                      className={styles['statusRailSlot']}
                      style={{
                        ...(dragging ? { transform: `translateY(${recentDrag.offsetY}px)`, zIndex: 3 } : {}),
                        touchAction: 'none',
                      }}
                    >
                      {renderCard(entry, false, false, event => { recentDrag.begin(event, entry.cardId) })}
                    </div>
                  )
                })}
              </>
            )
            : null}
        </div>
      </div>
      {drag !== null && floatingEntry !== undefined
        ? (
          <div
            className={styles['statusRailFloating']}
            style={{
              left: drag.left,
              width: drag.width,
              top: drag.baseTop + (drag.pointerY - drag.startPointerY),
            }}
          >
            {renderCard(floatingEntry, true)}
          </div>
        )
        : null}
      {menu !== null
        ? <RailCardMenu target={menu} onClose={() => { setMenu(null) }} />
        : null}
      <button
        type="button"
        ref={tabRef}
      className={styles['statusRailTab']}
        aria-expanded={open}
        aria-label={open ? t('statusRail.close') : t('statusRail.open')}
        title={open ? t('statusRail.close') : t('statusRail.open')}
        onClick={toggle}
      >
        {/* Two bars with two dots under them. */}
        <svg viewBox="0 0 12 28" width="14" height="30" aria-hidden="true">
          <rect x="1.4" y="1" width="2" height="20" rx="1" fill="currentColor" />
          <rect x="8.6" y="1" width="2" height="20" rx="1" fill="currentColor" />
          <circle cx="2.4" cy="25" r="1.5" fill="currentColor" />
          <circle cx="9.6" cy="25" r="1.5" fill="currentColor" />
        </svg>
        {props.entries.length > 0
          ? <span className={styles['statusRailTabCount']}>{props.entries.length}</span>
          : null}
      </button>
    </div>
  )
}
