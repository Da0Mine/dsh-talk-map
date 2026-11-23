/**
 * Preview reads are the expensive part of the plugin: one `readSurface` materialises the whole
 * event list (measured here: 1.9 s and +72 MB host memory for a single session; 12 concurrent
 * requests drove the host from 862 MB to 2 245 MB).
 *
 * Two changes, no behaviour change:
 *   - a bounded global concurrency limit instead of "all 40 at once";
 *   - a small cache keyed by the client's own `updatedAt` stamp, so a card that has not moved
 *     is served without reading the log again.
 */
import fs from 'node:fs'

const file = 'src/host/routes.ts'
let text = fs.readFileSync(file, 'utf8')
const edits = []

const routeBefore = text.slice(
  text.indexOf("        if (route === 'POST /talk-map/last-user') {"),
  text.indexOf('        if (route === \'POST /talk-map/client-boot\') {'),
)
if (routeBefore === '') throw new Error('last-user route not found')

const routeAfter = `        if (route === 'POST /talk-map/last-user') {
          const body = await readJsonBody(request)
          const listed = Array.isArray((body as { sessionIds?: unknown }).sessionIds)
            ? (body as { sessionIds: unknown[] }).sessionIds
            : []
          // Plain ids (older callers) or \`{ id, stamp }\` — the stamp is the client's own
          // session \`updatedAt\`, so an unchanged stamp means an unchanged last message.
          const wanted: { id: string; stamp?: number }[] = []
          for (const entry of listed) {
            if (typeof entry === 'string') {
              wanted.push({ id: entry })
              continue
            }
            if (entry === null || typeof entry !== 'object') continue
            const id = (entry as { id?: unknown }).id
            if (typeof id !== 'string') continue
            const stamp = (entry as { stamp?: unknown }).stamp
            wanted.push(typeof stamp === 'number' ? { id, stamp } : { id })
          }

          const texts: Record<string, string> = {}
          const query = runtime.sessionQuery
          if (query !== undefined) {
            const misses = wanted.filter((item) => {
              if (item.stamp === undefined) return true
              const cached = previewCache.get(item.id)
              if (cached === undefined || cached.stamp !== item.stamp) return true
              texts[item.id] = cached.text
              return false
            })
            // A single read can cost ~100 MB transiently, so they run a couple at a time
            // rather than forty (the old shape peaked around 2 GB of host memory).
            await runLimited(misses, PREVIEW_CONCURRENCY, async (item) => {
              try {
                const surface = await query.readSurface(item.id)
                let text = ''
                for (const raw of surface.events) {
                  const event = raw as { type?: string; data?: { source?: MessageSource; content?: unknown } }
                  if (event.type !== 'user/message') continue
                  // Only what the human sent: the runtime tags everything it
                  // injects with its own \`source.kind\` (runtime-context,
                  // time-context, dsh-mnemon, skill-catalog, …).
                  if (!isHumanMessage(event.data?.source)) continue
                  const body = textOfBlocks(event.data?.content)
                  if (body !== '') text = body
                }
                const trimmed = text.length > 240 ? text.slice(0, 240) : text
                if (item.stamp !== undefined) previewCache.set(item.id, { stamp: item.stamp, text: trimmed })
                if (trimmed !== '') texts[item.id] = trimmed
              } catch {
                // A session without a readable surface simply has no preview.
              }
            })
          }
          sendJson(response, 200, { texts })
          return
        }

`

// 1) swap the route body
text = text.replace(routeBefore, routeAfter)
edits.push('route: cache + global concurrency limit')

// 2) helpers, injected once before the route table
if (!text.includes('const previewCache = createPreviewCache(')) {
  const anchor = "        if (route === 'POST /talk-map/last-user') {"
  const helpers = `        // Preview reads materialise a whole session surface; keep only the extracted text.
        const previewCache = createPreviewCache(400)
${anchor}`
  text = text.replace(anchor, helpers)
  edits.push('previewCache')
}

// 3) import the helpers
if (!text.includes("from './preview.ts'")) {
  const importLine = text.split('\n').findIndex(line => line.includes('import '))
  if (importLine < 0) throw new Error('no import line')
  text = text.replace(
    /(^import [^\n]*\n)/m,
    `$1import { createPreviewCache, runLimited, PREVIEW_CONCURRENCY } from './preview.ts'\n`,
  )
  edits.push('import')
}

fs.writeFileSync(file, text, 'utf8')

// 4) the helper module itself
const helperPath = 'src/host/preview.ts'
if (!fs.existsSync(helperPath)) {
  fs.writeFileSync(helperPath, `/** Helpers for the preview route: bounded concurrency and a tiny text cache. */

/** How many session surfaces may be read at the same time (each one is tens of MB). */
export const PREVIEW_CONCURRENCY = 2

/**
 * Run \`task\` over \`items\` with at most \`limit\` in flight. Awaiting is sequential per worker,
 * so peak memory stays around \`limit\` surfaces instead of \`items.length\`.
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
`, 'utf8')
  edits.push('preview.ts')
}

console.log(edits.join(', '))
