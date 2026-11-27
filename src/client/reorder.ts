/**
 * Vertical drag-to-reorder for short card lists (the「最近的任务」strip and the sidebar queue).
 *
 * Behaves like the map's card drag: the picked row follows the pointer, rows it passes slide out of
 * the way, and on release every row glides to its new position (FLIP). Three details matter, and
 * each one has been a bug at least once:
 *
 *  - Row centres are captured ONCE at the press. Measuring live positions fed the shift back into
 *    the measurement and made the neighbours jitter.
 *  - The id list must be the RENDERED order, otherwise the committed sequence is one the list
 *    never showed.
 *  - The FLIP correction is driven by requestAnimationFrame from the release handler, NOT by an
 *    effect keyed on the id array: a fresh array identity every render tore down the animation
 *    frames, so the correction stayed on screen and the rows looked teleported.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ReorderOptions {
  /** Optional priority bucket per id: a row may only be dropped inside its own bucket. */
  bucketOf?: (id: string) => number
}

export interface ReorderApi {
  /** Id being dragged, so the row can lift. */
  draggingId: string | undefined
  /** Pointer travel since the press, for the lift offset. */
  offsetY: number
  /** How far a given row should slide to open a gap. */
  shiftOf: (id: string) => number
  /** Post-commit correction (FLIP), so a released row settles instead of jumping. */
  flipOf: (id: string) => number
  /** True only on the first FLIP frame, where the row must not animate toward its offset. */
  flipping: boolean
  /** True right after a real drag, so the row's own click does not fire. */
  shouldIgnoreClick: () => boolean
  begin: (event: React.PointerEvent<HTMLElement>, id: string) => void
  register: (id: string, element: HTMLElement | null) => void
}

interface DragState {
  id: string
  index: number
  startY: number
  /** Row height + gap, measured at the press. */
  step: number
  /** Row centres captured at the press. */
  centres: number[]
}

const CLICK_GUARD_MS = 350

export function useReorder(
  ids: readonly string[],
  apply: (next: string[]) => void,
  options: ReorderOptions = {},
): ReorderApi {
  const slots = useRef(new Map<string, HTMLElement>())
  const idsRef = useRef(ids)
  idsRef.current = ids
  const bucketRef = useRef(options.bucketOf)
  bucketRef.current = options.bucketOf
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hover, setHover] = useState(-1)
  const [offsetY, setOffsetY] = useState(0)
  const [flip, setFlip] = useState<Record<string, number>>({})
  const [flipPhase, setFlipPhase] = useState<0 | 1 | 2>(2)
  const dragEndAt = useRef(0)

  const begin = useCallback((event: React.PointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('button') !== null) return
    const list = idsRef.current
    const index = list.indexOf(id)
    if (index < 0) return
    const element = slots.current.get(id)
    const height = element === undefined ? 0 : element.getBoundingClientRect().height
    const next = slots.current.get(list[index + 1])
    const gap = element === undefined || next === undefined
      ? 8
      : Math.max(0, next.getBoundingClientRect().top - element.getBoundingClientRect().bottom)
    const centres = list.map(rowId => {
      const row = slots.current.get(rowId)
      if (row === undefined) return Number.NaN
      const rect = row.getBoundingClientRect()
      return rect.top + rect.height / 2
    })
    setDrag({ id, index, startY: event.clientY, step: height + gap, centres })
    setHover(index)
    setOffsetY(0)
    event.preventDefault()
  }, [])

  const register = useCallback((id: string, element: HTMLElement | null) => {
    if (element === null) slots.current.delete(id)
    else slots.current.set(id, element)
  }, [])

  const shiftOf = useCallback((id: string): number => {
    if (drag === null || id === drag.id || hover < 0) return 0
    const index = idsRef.current.indexOf(id)
    if (index < 0) return 0
    if (hover > drag.index && index > drag.index && index <= hover) return -drag.step
    if (hover < drag.index && index >= hover && index < drag.index) return drag.step
    return 0
  }, [drag, hover])

  const flipOf = useCallback((id: string): number => flip[id] ?? 0, [flip])
  const shouldIgnoreClick = useCallback(() => Date.now() - dragEndAt.current < CLICK_GUARD_MS, [])

  useEffect(() => {
    if (drag === null) return
    const onMove = (event: PointerEvent): void => {
      setOffsetY(event.clientY - drag.startY)
      const bucketOf = bucketRef.current
      const ownBucket = bucketOf === undefined ? undefined : bucketOf(drag.id)
      let target = drag.index
      let bestDistance = Number.POSITIVE_INFINITY
      drag.centres.forEach((centre, index) => {
        if (Number.isNaN(centre)) return
        const id = idsRef.current[index]
        if (id === undefined) return
        if (bucketOf !== undefined && bucketOf(id) !== ownBucket) return
        const distance = Math.abs(event.clientY - centre)
        if (distance < bestDistance) {
          bestDistance = distance
          target = index
        }
      })
      setHover(target)
    }
    const onUp = (): void => {
      const list = idsRef.current
      const from = list.indexOf(drag.id)
      const target = hover
      const moved = Math.abs(offsetY) > 3 || (target >= 0 && target !== from)
      const willReorder = from >= 0 && target >= 0 && target !== from

      // Layout positions BEFORE the new order renders. offsetTop ignores the drag transforms;
      // the dragged row uses its visual top so it settles from where the pointer left it.
      const before = new Map<string, number>()
      if (willReorder) {
        for (const id of list) {
          const element = slots.current.get(id)
          if (element === undefined) continue
          before.set(id, id === drag.id ? element.getBoundingClientRect().top : element.offsetTop)
        }
      }

      if (willReorder) {
        const next = [...list]
        next.splice(from, 1)
        next.splice(target, 0, drag.id)
        apply(next)
      }
      if (moved) dragEndAt.current = Date.now()
      setDrag(null)
      setHover(-1)
      setOffsetY(0)

      if (before.size === 0) return
      const releasedId = drag.id
      requestAnimationFrame(() => {
        const deltas: Record<string, number> = {}
        for (const [id, top] of before) {
          const element = slots.current.get(id)
          if (element === undefined) continue
          const after = id === releasedId ? element.getBoundingClientRect().top : element.offsetTop
          const delta = top - after
          if (Math.abs(delta) > 1) deltas[id] = delta
        }
        if (Object.keys(deltas).length === 0) return
        setFlip(deltas)
        setFlipPhase(0)
        requestAnimationFrame(() => {
          // Arm the transition while the rows are still parked, then release them.
          setFlipPhase(1)
          requestAnimationFrame(() => {
            setFlip({})
            setFlipPhase(2)
          })
        })
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag, hover, offsetY, apply])

  return {
    draggingId: drag?.id,
    offsetY,
    shiftOf,
    flipOf,
    flipping: flipPhase === 0,
    shouldIgnoreClick,
    begin,
    register,
  }
}
