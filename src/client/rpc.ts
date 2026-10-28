/**
 * The one place that speaks to the Host.
 *
 * Everything the map does remotely goes through `connection.rpc.call('/api',
 * endpoint, { args: { request } })` — the generated endpoint for a
 * `@Remote(...)` Host method, whose single parameter is called `request`:
 *
 *   sessionController.rename      → 'session/rename'
 *   sessionController.create      → 'session/create'
 *   sessionController.prompt      → 'session/prompt'
 *   workspaceController.rename    → 'workspace/rename'
 *   workspaceController.create    → 'workspace/create'
 *
 * Result envelope: `{ ok: true, value } | { ok: false, error }`.
 * (An earlier version of this plugin invented a `connection.api.sessions.*`
 * shape that never existed; the optional chain swallowed it and features simply
 * did nothing.)
 */
import { talkMapApi } from './api.ts'
import { connectionService } from './map-state.ts'
import { t } from './i18n.ts'

export interface RpcFailure {
  code?: string
  message?: string
}

/**
 * Call one Host endpoint. Throws with the Host's own message on failure, so the
 * UI can show the real reason instead of a generic "not ready".
 */
export async function callRpc<T>(endpoint: string, request: Record<string, unknown> = {}): Promise<T> {
  const rpc = connectionService()?.rpc
  if (rpc === undefined) throw new Error(t('spawn.apiUnavailable'))
  const result = await rpc.call('/api', endpoint, { args: { request } })
  if (result.ok !== true) {
    const failure = (result as { error?: RpcFailure }).error
    throw new Error(`${endpoint}: ${failure?.message ?? failure?.code ?? 'failed'}`)
  }
  return (result as { value: T }).value
}

/** Report a client-side failure to the Host log, so it is diagnosable later. */
export function reportToHost(payload: Record<string, unknown>): void {
  try {
    void fetch('/talk-map/client-boot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ at: new Date().toISOString(), ...payload }),
    }).catch(() => {})
  } catch { /* nothing to do */ }
}

export interface ContentHit {
  sessionId: string
  snippet: string
}

/**
 * Full-text search across every conversation.
 *
 * Two paths, in order: the Host's generated endpoint over the shared connection
 * (session/search), then our own Host route (/talk-map/search). The second
 * exists because the drawer's search must not degrade to title-only matching if
 * the RPC surface is missing — and the failure of the first one is logged so it
 * can be diagnosed instead of guessed at.
 */
export async function searchSessions(query: string): Promise<ContentHit[]> {
  const normalize = (items: readonly { sessionId?: string; snippet?: string }[] | undefined): ContentHit[] =>
    (items ?? [])
      .filter((item): item is { sessionId: string; snippet?: string } => typeof item.sessionId === 'string')
      .map(item => ({ sessionId: item.sessionId, snippet: item.snippet ?? '' }))

  try {
    const page = await callRpc<{ items?: { sessionId: string; snippet?: string }[] }>('session/search', { query })
    const hits = normalize(page.items)
    if (hits.length > 0) return hits
    // Empty is a legitimate answer, but log which path produced it.
    reportToHost({ phase: 'search-rpc-empty', query })
    return hits
  } catch (error) {
    reportToHost({ phase: 'search-rpc-failed', query, message: String((error as Error)?.message ?? error) })
  }
  try {
    const fallback = await talkMapApi.searchSessions(query)
    return normalize(fallback.items)
  } catch (error) {
    reportToHost({ phase: 'search-host-failed', query, message: String((error as Error)?.message ?? error) })
    throw error
  }
}