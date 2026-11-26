/**
 * Vertical drag-to-reorder for short card lists (the「最近的任务」strip and the sidebar queue).
 *
 * Behaves like the map's card drag: the picked row follows the pointer, the rows it passes slide
 * out of the way, and the commit happens on release. The map rail's main list has its own
 * machinery (priority buckets, FLIP, floating copy); these two lists are flat, so this smaller
 * implementation is enough.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ReorderApi {
  /** Id being dragged, so the row can lift. */
  draggingId: string | undefined
  /** Pointer travel since the press, for the lift offset. */
  offsetY: number
  /** How far a given row should slide to open a gap. */
  shiftOf: (id: string) => number
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
}

export function useReorder(
  ids: readonly string[],
  apply: (next: string[]) => void,
): ReorderApi {
  const slots = useRef(new Map<string, HTMLElement>())
  const idsRef = useRef(ids)
  idsRef.current = ids
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hover, setHover] = useState(-1)
  const [offsetY, setOffsetY] = useState(0)

  const begin = useCallback((event: React.PointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0) return
    // Buttons inside a row keep their own behaviour.
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
    setDrag({ id, index, startY: event.clientY, step: height + gap })
    setHover(index)
    setOffsetY(0)
    // Text selection would fight the drag.
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

  useEffect(() => {
    if (drag === null) return
    const onMove = (event: PointerEvent): void => {
      setOffsetY(event.clientY - drag.startY)
      const list = idsRef.current
      let target = drag.index
      let bestDistance = Number.POSITIVE_INFINITY
      list.forEach((id, index) => {
        const element = slots.current.get(id)
        if (element === undefined) return
        const rect = element.getBoundingClientRect()
        const distance = Math.abs(event.clientY - (rect.top + rect.height / 2))
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
      if (from >= 0 && hover >= 0 && hover !== from) {
        const next = [...list]
        next.splice(from, 1)
        next.splice(hover, 0, drag.id)
        apply(next)
      }
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
  }, [drag, hover, apply])

  return { draggingId: drag?.id, offsetY, shiftOf, begin, register }
}
