/**
 * HTTP surface bridging the browser map to the host. Everything lives under
 * the /talk-map/ prefix — deliberately NOT /api (that prefix carries dsh's
 * browser-trust fence). Mutations accept same-origin browser requests and
 * origin-less local tools (curl); a cross-origin browser POST is refused.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve as resolvePath, sep } from 'node:path'
import { z } from 'zod'
import type { DomainChanged, TalkMapHostServices } from './dsh-host.ts'
import type { DigestPipeline } from './digest/pipeline.ts'
import { SessionNotLiveError, type Spawner } from './spawn.ts'
import { cardSchema, edgeSchema, globalSchema, DOMAIN_NAME, type TalkMapStore } from './store.ts'

/**
 * Capabilities filled in by independently-injected layers: the digest layer
 * needs llm + sessionQuery, the spawn layer needs agents. Either can be
 * missing in an unusual composition — routes answer 503 rather than the
 * whole plugin refusing to mount.
 */
export interface TalkMapRuntime {
  digest?: DigestPipeline
  spawner?: Spawner
  /** Read a session's surface — powers the card body (user's last message). */
  sessionQuery?: { readSurface(sessionId: string): Promise<{ events: readonly unknown[]; capturedThroughSeq: number | null }> }
  /** Deployment default model route (from ctx.agentDefaultModel). */
  modelDefault?: () => { provider: string; model: string; reasoningEffort?: string }
  /** Deployment default agent preset id (from ctx.agentPresets). */
  presetDefault?: () => string
}

const MAX_BODY_BYTES = 1024 * 1024

/** Concatenate the text blocks of a message payload (tool results have none). */
function textOfBlocks(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .filter((block): block is { type: 'text'; text: string } =>
      typeof block === 'object' && block !== null
      && (block as { type?: unknown }).type === 'text'
      && typeof (block as { text?: unknown }).text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
}

/**
 * What the human actually typed.
 *
 * Verified against real session logs: the runtime appends its envelopes either
 * as their OWN user message (`Time sampled while preparing…` plus
 * `Browser time zone…`/`Elapsed since…`, or a `Current runtime context.…` block)
 * or onto the human's message. A message that STARTS with such a marker carries
 * no human text and is skipped whole; everything else keeps its body with only
 * the trailing envelope blocks removed.
 */
/** Only messages the human sent; the runtime tags its own injections. */
export interface MessageSource {
  readonly kind?: string
}

function isHumanMessage(source: MessageSource | undefined): boolean {
  const kind = source?.kind
  return kind === undefined || kind === 'user'
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(payload)
}

function sameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin
  if (origin === undefined) return true // curl / same-machine tooling
  const host = request.headers.host
  if (host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  return text === '' ? undefined : JSON.parse(text)
}

function tableToRecord<V>(table: { entries(): IterableIterator<[string, V]> }): Record<string, V> {
  const out: Record<string, V> = {}
  for (const [key, value] of table.entries()) out[key] = value
  return out
}

const upsertCardsBody = z.object({
  cards: z.record(z.string(), cardSchema),
})
const upsertEdgesBody = z.object({
  edges: z.record(z.string(), edgeSchema),
})
const deleteCardsBody = z.object({
  ids: z.array(z.string()),
})
const setGlobalBody = z.object({
  global: globalSchema,
})
const spawnBody = z.object({
  parents: z.array(z.object({
    cardId: z.string(),
    sessionId: z.string(),
    text: z.string().min(1),
  })).min(1),
  boardId: z.string(),
  x: z.number(),
  y: z.number(),
  wsOverride: z.string().optional(),
})
const refreshDigestBody = z.object({
  sessionId: z.string(),
})
const injectBody = z.object({
  sessionId: z.string(),
  parents: z.array(z.object({
    sessionId: z.string(),
    text: z.string().min(1),
  })).min(1),
})
const ensureDirBody = z.object({
  path: z.string().min(1),
})

/**
 * Register the /talk-map/ routes.
 * @param services - host services (webServer + event bus).
 * @param storeReady - resolves when the storage domain is open; handlers await it.
 * @returns disposer removing the route registration and closing SSE clients.
 */
export function mountTalkMapRoutes(
  services: TalkMapHostServices,
  storeReady: Promise<TalkMapStore>,
  runtime: TalkMapRuntime,
): () => void {
  const sseClients = new Set<ServerResponse>()

  const offChanged = services.on('domain/changed', (...args: unknown[]) => {
    const change = args[0] as DomainChanged
    if (change.domain !== DOMAIN_NAME) return
    const frame = `event: change\ndata: ${JSON.stringify(change)}\n\n`
    for (const client of sseClients) client.write(frame)
  })

  const ping = setInterval(() => {
    for (const client of sseClients) client.write(': ping\n\n')
  }, 25_000)
  ping.unref?.()

  const unregister = services.webServer.register({
    kind: 'prefix',
    // NOTE: webserver prefix p matches `p` and `p/<anything>` — no trailing slash.
    path: '/talk-map',
    handler: async (request, response) => {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
      const route = `${request.method ?? 'GET'} ${url.pathname}`
      try {
        if (route === 'GET /talk-map/state') {
          const store = await storeReady
          sendJson(response, 200, {
            boards: tableToRecord(store.boards),
            cards: tableToRecord(store.cards),
            edges: tableToRecord(store.edges),
            digests: tableToRecord(store.digests),
            global: store.global(),
          })
          return
        }

        if (route === 'GET /talk-map/defaults') {
          let model: unknown = null
          let preset: unknown = null
          try {
            model = runtime.modelDefault?.() ?? null
          } catch { /* unresolved default model config */ }
          try {
            preset = runtime.presetDefault?.() ?? null
          } catch { /* no presets composed */ }
          sendJson(response, 200, { model, preset })
          return
        }

        if (route === 'GET /talk-map/events') {
          response.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-store',
            'connection': 'keep-alive',
          })
          response.write(': connected\n\n')
          sseClients.add(response)
          request.on('close', () => { sseClients.delete(response) })
          return
        }

        if (request.method === 'POST' && !sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request refused' })
          return
        }

        if (route === 'POST /talk-map/cards/upsert') {
          const store = await storeReady
          const body = upsertCardsBody.parse(await readJsonBody(request))
          for (const [id, card] of Object.entries(body.cards)) {
            await store.cards.put(id, card)
            // A card without a usable digest gets one queued (hash-skip keeps it cheap).
            const digest = store.digests.get(card.sessionId)
            if (digest === undefined || digest.summary === '') {
              runtime.digest?.schedule(card.sessionId)
            }
          }
          sendJson(response, 200, { ok: true, count: Object.keys(body.cards).length })
          return
        }

        if (route === 'POST /talk-map/edges/upsert') {
          const store = await storeReady
          const body = upsertEdgesBody.parse(await readJsonBody(request))
          for (const [id, edge] of Object.entries(body.edges)) {
            await store.edges.put(id, edge)
          }
          sendJson(response, 200, { ok: true, count: Object.keys(body.edges).length })
          return
        }

        if (route === 'POST /talk-map/cards/delete') {
          const store = await storeReady
          const body = deleteCardsBody.parse(await readJsonBody(request))
          let removed = 0
          for (const id of body.ids) {
            if (await store.cards.delete(id)) removed += 1
          }
          // A card's edges die with it — a dangling edge renders nothing anyway.
          for (const [edgeId, edge] of [...store.edges.entries()]) {
            if (body.ids.includes(edge.fromCardId) || body.ids.includes(edge.toCardId)) {
              await store.edges.delete(edgeId)
            }
          }
          sendJson(response, 200, { ok: true, removed })
          return
        }

        if (route === 'POST /talk-map/edges/delete') {
          const store = await storeReady
          const body = deleteCardsBody.parse(await readJsonBody(request))
          let removed = 0
          for (const id of body.ids) {
            if (await store.edges.delete(id)) removed += 1
          }
          sendJson(response, 200, { ok: true, removed })
          return
        }

        if (route === 'POST /talk-map/global') {
          const store = await storeReady
          const body = setGlobalBody.parse(await readJsonBody(request))
          await store.setGlobal(body.global)
          sendJson(response, 200, { ok: true })
          return
        }

        if (route === 'POST /talk-map/inject') {
          if (runtime.spawner === undefined) {
            sendJson(response, 503, { error: 'spawn layer unavailable (agents service missing)' })
            return
          }
          const body = injectBody.parse(await readJsonBody(request))
          try {
            runtime.spawner.injectInto(body.sessionId, body.parents)
          } catch (error) {
            // Structured code — clients branch on it instead of substring-
            // matching a quadruple-stringified error message.
            if (error instanceof SessionNotLiveError) {
              sendJson(response, 409, { error: String(error), code: 'session-not-live' })
              return
            }
            throw error
          }
          sendJson(response, 200, { ok: true })
          return
        }

        if (route === 'POST /talk-map/spawn') {
          if (runtime.spawner === undefined) {
            sendJson(response, 503, { error: 'spawn layer unavailable (agents service missing)' })
            return
          }
          const body = spawnBody.parse(await readJsonBody(request))
          const result = await runtime.spawner.spawn(body)
          sendJson(response, 200, result)
          return
        }

        if (route === 'POST /talk-map/fs/ensure-dir') {
          // dsh's workspace.create only REGISTERS an existing directory
          // (realpath fails on a missing one) — the draft composer's
          // "new workspace" flow creates the folder here first.
          const body = ensureDirBody.parse(await readJsonBody(request))
          const target = resolvePath(body.path)
          const home = homedir()
          if (target !== home && !target.startsWith(home + sep)) {
            sendJson(response, 400, { error: 'path must be inside the home directory' })
            return
          }
          await mkdir(target, { recursive: true })
          sendJson(response, 200, { ok: true, path: target })
          return
        }

        // Card bodies: the last thing the USER said in each session, read off the
        // session surface. Batched — the map asks once per change, not per card.
        /**
         * Full-text search over every conversation, on the Host's own service.
         * The drawer prefers the shared connection's session/search, but falls
         * back here so the feature cannot degrade to title-only matching.
         */
        if (route === 'POST /talk-map/search') {
          const body = await readJsonBody(request) as { query?: unknown } | undefined
          const query = typeof body?.query === 'string' ? body.query.trim() : ''
          const search = (runtime as { search?: (q: string) => Promise<{ items?: unknown[]; hasMore?: boolean }> }).search
          if (query === '' || search === undefined) {
            sendJson(response, 200, { items: [], hasMore: false })
            return
          }
          try {
            const page = await search(query)
            sendJson(response, 200, { items: page?.items ?? [], hasMore: page?.hasMore === true })
          } catch (error) {
            sendJson(response, 500, { error: String((error as Error)?.message ?? error) })
          }
          return
        }
        /** The passage around one hit — read on demand (hover), never with search. */
        if (route === 'POST /talk-map/search-context') {
          const body = await readJsonBody(request) as { sessionId?: unknown; seq?: unknown; query?: unknown } | undefined
          const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
          const seq = typeof body?.seq === 'number' ? body.seq : null
          const query = typeof body?.query === 'string' ? body.query : ''
          const read = (runtime as {
            searchContext?: (id: string, seq: number, q: string) => Promise<{ lines: string[] }>
          }).searchContext
          if (sessionId === '' || seq === null || read === undefined) {
            sendJson(response, 200, { lines: [] })
            return
          }
          try {
            sendJson(response, 200, await read(sessionId, seq, query))
          } catch (error) {
            sendJson(response, 200, { lines: [], error: String((error as Error)?.message ?? error) })
          }
          return
        }
        if (route === 'POST /talk-map/last-user') {
          const body = await readJsonBody(request)
          const ids = Array.isArray((body as { sessionIds?: unknown }).sessionIds)
            ? ((body as { sessionIds: unknown[] }).sessionIds.filter(id => typeof id === 'string') as string[]).slice(0, 200)
            : []
          const texts: Record<string, string> = {}
          const query = runtime.sessionQuery
          if (query !== undefined) {
            // ~250ms per surface read; read them concurrently — a board has ~20.
            await Promise.all(ids.map(async (sessionId) => {
              try {
                const surface = await query.readSurface(sessionId)
                let text = ''
                for (const raw of surface.events) {
                  const event = raw as { type?: string; data?: { source?: MessageSource; content?: unknown } }
                  if (event.type !== 'user/message') continue
                  // Only what the human sent: the runtime tags everything it
                  // injects with its own `source.kind` (runtime-context,
                  // time-context, dsh-mnemon, skill-catalog, …).
                  if (!isHumanMessage(event.data?.source)) continue
                  const body = textOfBlocks(event.data?.content)
                  if (body !== '') text = body
                }
                if (text !== '') texts[sessionId] = text.length > 240 ? text.slice(0, 240) : text
              } catch {
                // A session without a readable surface simply has no preview.
              }
            }))
          }
          sendJson(response, 200, { texts })
          return
        }

        if (route === 'POST /talk-map/context-window') {
          // "What the model is being given right now": every record the log still carries,
          // minus the ones compaction pruned (compaction/prune names them by seq). That is
          // the live window — older, already-compressed history is deliberately absent.
          const body = (await readJsonBody(request)) as { sessionId?: unknown; maxChars?: unknown }
          const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
          if (sessionId === '') {
            sendJson(response, 400, { error: 'sessionId is required' })
            return
          }
          const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 40000
          const maxChars = Math.min(Math.max(requested, 4000), 400000)
          const query = runtime.sessionQuery
          if (query === undefined) {
            sendJson(response, 503, { error: 'session surface unavailable' })
            return
          }
          const surface = await query.readSurface(sessionId)
          // 1) seqs compaction threw away
          const pruned = new Set<number>()
          for (const raw of surface.events) {
            const event = raw as { type?: string; data?: { shadowedSeqs?: unknown } }
            if (event.type !== 'compaction/prune') continue
            const seqs = event.data?.shadowedSeqs
            if (!Array.isArray(seqs)) continue
            for (const seq of seqs) if (typeof seq === 'number') pruned.add(seq)
          }
          // 2) everything else, in order
          const lines: string[] = []
          for (const raw of surface.events) {
            const event = raw as {
              type?: string
              seq?: number
              data?: {
                content?: unknown
                message?: { content?: unknown }
                name?: unknown
                toolName?: unknown
                arguments?: unknown
                input?: unknown
                output?: unknown
              }
            }
            const seq = typeof event.seq === 'number' ? event.seq : -1
            if (pruned.has(seq)) continue
            if (event.type === 'user/message') {
              const said = textOfBlocks(event.data?.content)
              if (said !== '') lines.push(`USER: ${said}`)
            } else if (event.type === 'assistant/message') {
              const said = textOfBlocks(event.data?.message?.content)
              if (said !== '') lines.push(`ASSISTANT: ${said}`)
            } else if (event.type === 'tool/call') {
              const name = typeof event.data?.name === 'string'
                ? event.data.name
                : typeof event.data?.toolName === 'string' ? event.data.toolName : 'tool'
              let args = ''
              try {
                args = JSON.stringify(event.data?.arguments ?? event.data?.input ?? {})
              } catch {
                args = ''
              }
              lines.push(`TOOL ${name}(${args.slice(0, 160)})`)
            } else if (event.type === 'tool/result') {
              const said = textOfBlocks(event.data?.content)
              const body = said !== '' ? said : typeof event.data?.output === 'string' ? event.data.output : ''
              if (body !== '') lines.push(`RESULT: ${body.length > 240 ? `${body.slice(0, 240)}…` : body}`)
            }
          }
          // Tool output is the bulk (a real 34k-record log: 5106 tool lines vs 1229 human
          // ones, 2.4M chars) and the model does not need every byte of it. Over budget:
          // keep the human/assistant line first, then add tool lines from the newest end
          // while they fit. That keeps the conversation readable instead of truncating
          // the tail into a tool-output wall.
          const essential = lines.filter(line => !line.startsWith('TOOL ') && !line.startsWith('RESULT: '))
          const tooling = lines.filter(line => line.startsWith('TOOL ') || line.startsWith('RESULT: '))
          let text = essential.join('\n\n')
          let truncated = false
          if (text.length > maxChars) {
            text = text.slice(text.length - maxChars)
            const cut = text.indexOf('\n\n')
            if (cut > 0 && cut < 400) text = text.slice(cut + 2)
            truncated = true
          } else {
            const room = maxChars - text.length
            const kept: string[] = []
            let used = 0
            for (let index = tooling.length - 1; index >= 0; index -= 1) {
              const line = tooling[index]!
              if (used + line.length + 2 > room) { truncated = true; break }
              kept.push(line)
              used += line.length + 2
            }
            if (kept.length > 0) {
              kept.reverse()
              text = `${text}\n\n[tool activity]\n${kept.join('\n\n')}`
            }
            if (kept.length < tooling.length) truncated = true
          }
          sendJson(response, 200, {
            sessionId,
            text,
            chars: text.length,
            entries: lines.length,
            prunedRecords: pruned.size,
            truncated,
          })
          return
        }

        if (route === 'POST /talk-map/digest/refresh') {
          if (runtime.digest === undefined) {
            sendJson(response, 503, { error: 'digest layer unavailable (llm service missing)' })
            return
          }
          const body = refreshDigestBody.parse(await readJsonBody(request))
          const digest = await runtime.digest.refresh(body.sessionId)
          sendJson(response, 200, { sessionId: body.sessionId, digest })
          return
        }

        sendJson(response, 404, { error: `no such route: ${route}` })
      } catch (error) {
        services.logger?.warn(`[dsh-talk-map] ${route} failed: ${String(error)}`)
        if (!response.headersSent) {
          sendJson(response, 400, { error: String(error) })
        } else {
          response.end()
        }
      }
    },
  })

  return () => {
    clearInterval(ping)
    offChanged()
    for (const client of sseClients) client.end()
    sseClients.clear()
    unregister()
  }
}
