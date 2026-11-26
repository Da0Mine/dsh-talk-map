/**
 * Vertical drag-to-reorder for short card lists (the「最近的任务」strip and the sidebar queue).
 *
 * Behaves like the map's card drag: the picked row follows the pointer, rows it passes slide out of
 * the way, and the commit happens on release. Two details matter and both were wrong before:
 *
 *  - Row centres are captured ONCE at the press. Measuring live positions fed the shift back into
 *    the measurement and made the neighbours jitter.
 *  - The id list must be the RENDERED order. Passing a differently-sorted array committed a
 *    sequence the list never showed.
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
  /** True right after a real drag, so the row's own click does not fire. */
  shouldIgnoreClick: () => boolean
  /** Attach to each row: `onPointerDown={event => api.begin(event, id)}`. */
  begin: (event: React.PointerEvent<HTMLElement>, id: string) => void
  /** Attach to each row so the hook can measure it. */
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

  const shouldIgnoreClick = useCallback(() => Date.now() - dragEndAt.current < CLICK_GUARD_MS, [])

  useEffect(() => {
    if (drag === null) return
    const onMove = (event: PointerEvent): void => {
      setOffsetY(event.clientY - drag.startY)
      const bucketOf = bucketRef.current
      const ownBucket = bucketOf === undefined ? undefined : bucketOf(drag.id)
      let target = drag.index
      let bestDistance = Number.POSITIVE_INFINITY
      // Only rows from the captured list take part; their centres never move during the drag.
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
      const moved = Math.abs(offsetY) > 3 || (hover >= 0 && hover !== from)
      if (from >= 0 && hover >= 0 && hover !== from) {
        const next = [...list]
        next.splice(from, 1)
        next.splice(hover, 0, drag.id)
        apply(next)
      }
      if (moved) dragEndAt.current = Date.now()
      setDrag(null)
      setHover(-1)
      setOffsetY(0)
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

  return { draggingId: drag?.id, offsetY, shiftOf, shouldIgnoreClick, begin, register }
}
