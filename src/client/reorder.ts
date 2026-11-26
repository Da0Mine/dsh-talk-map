/**
 * Vertical drag-to-reorder for short card lists (the「最近的任务」strip and the sidebar queue).
 *
 * The map rail's main list has its own machinery (buckets, FLIP, floating copy). These two lists
 * are flat, so a much smaller implementation is enough: follow the pointer, work out which row it
 * is over by comparing slot centres, commit the swap on release.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ReorderApi {
  /** Id being dragged, so the row can lift. */
  draggingId: string | undefined
  /** Pointer travel since the press, for the lift offset. */
  offsetY: number
  /** Attach to each row: `onPointerDown={event => api.begin(event, id)}`. */
  begin: (event: React.PointerEvent<HTMLElement>, id: string) => void
  /** Attach to each row so the hook can measure it. */
  register: (id: string, element: HTMLElement | null) => void
}

export function useReorder(
  ids: readonly string[],
  apply: (next: string[]) => void,
): ReorderApi {
  const slots = useRef(new Map<string, HTMLElement>())
  const idsRef = useRef(ids)
  idsRef.current = ids
  const [drag, setDrag] = useState<{ id: string; startY: number } | null>(null)
  const [offsetY, setOffsetY] = useState(0)

  const begin = useCallback((event: React.PointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0) return
    // Left alone: buttons inside a row (chips, etc.) keep their own behaviour.
    if ((event.target as HTMLElement).closest('button') !== null) return
    setDrag({ id, startY: event.clientY })
    setOffsetY(0)
  }, [])

  const register = useCallback((id: string, element: HTMLElement | null) => {
    if (element === null) slots.current.delete(id)
    else slots.current.set(id, element)
  }, [])

  useEffect(() => {
    if (drag === null) return
    const onMove = (event: PointerEvent): void => setOffsetY(event.clientY - drag.startY)
    const onUp = (event: PointerEvent): void => {
      const list = idsRef.current
      const from = list.indexOf(drag.id)
      if (from >= 0) {
        let target = from
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
        if (target !== from) {
          const next = [...list]
          next.splice(from, 1)
          next.splice(target, 0, drag.id)
          apply(next)
        }
      }
      setDrag(null)
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
  }, [drag, apply])

  return { draggingId: drag?.id, offsetY, begin, register }
}
