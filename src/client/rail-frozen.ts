/** "Canvas is moving" — the rail swaps its refraction filter for a cheap blur. */
let frozen = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function publish(next: boolean): void {
  if (frozen === next) return
  frozen = next
  for (const listener of listeners) listener()
}

export const railFrozen = {
  isFrozen(): boolean {
    return frozen
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  freeze(): void {
    if (timer !== undefined) { clearTimeout(timer); timer = undefined }
    publish(true)
  },
  thaw(delayMs = 120): void {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => { timer = undefined; publish(false) }, delayMs)
  },
}
