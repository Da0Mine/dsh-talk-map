/** Helpers for the preview route: bounded concurrency and a tiny text cache. */

/** How many session surfaces may be read at the same time (each one is tens of MB). */
export const PREVIEW_CONCURRENCY = 3

/**
 * Run `task` over `items` with at most `limit` in flight. Awaiting is sequential per worker,
 * so peak memory stays around `limit` surfaces instead of `items.length`.
 */
export async function runLimited<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  const width = Math.max(1, Math.min(limit, items.length))
  let cursor = 0
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      await task(items[index])
    }
  }
  await Promise.all(Array.from({ length: width }, worker))
}

export interface PreviewEntry {
  stamp: number
  text: string
}

/** Insertion-ordered map used as an LRU: re-setting a key moves it to the end. */
export function createPreviewCache(max: number): {
  get(id: string): PreviewEntry | undefined
  set(id: string, entry: PreviewEntry): void
  readonly size: number
} {
  const store = new Map<string, PreviewEntry>()
  return {
    get(id) {
      const hit = store.get(id)
      if (hit === undefined) return undefined
      store.delete(id)
      store.set(id, hit)
      return hit
    },
    set(id, entry) {
      store.delete(id)
      store.set(id, entry)
      while (store.size > max) {
        const oldest = store.keys().next()
        if (oldest.done === true) break
        store.delete(oldest.value)
      }
    },
    get size() {
      return store.size
    },
  }
}
