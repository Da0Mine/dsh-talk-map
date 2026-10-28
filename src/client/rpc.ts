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
