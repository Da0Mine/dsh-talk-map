/** "The canvas is moving" — the rail drops its live blur while this is true. */
let frozen = false
let thawTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function publish(next: boolean): void {
  if (frozen === next) return
  frozen = next
  for (const listener of listeners) listener()
}

export const railGlass = {
  isFrozen(): boolean {
    return frozen
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  /** Canvas started moving: drop the blur immediately. */
  freeze(): void {
    if (thawTimer !== undefined) {
      clearTimeout(thawTimer)
      thawTimer = undefined
    }
    publish(true)
  },
  /** Canvas stopped: restore the blur once it is actually still. */
  thaw(delayMs = 140): void {
    if (thawTimer !== undefined) clearTimeout(thawTimer)
    thawTimer = setTimeout(() => {
      thawTimer = undefined
      publish(false)
    }, delayMs)
  },
}
