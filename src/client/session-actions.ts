/**
 * Session lifecycle actions behind the map's context menu and batch bar.
 *
 * Delete goes THROUGH dsh-recycle-bin's own Host route (`dsh-session-recycle-bin/api`,
 * the exact path its own delete dialog posts to), so a card deleted here lands in
 * the same recycle bin, with the same "running work refuses" policy and the same
 * restorability. Archive and pin use the shipped client services, which keeps the
 * map and the sidebar in sync in both directions.
 */
import { uiWorkspaceService } from './map-state.ts'

const RECYCLE_BIN_ROUTE = 'dsh-session-recycle-bin/api'

interface RecycleBinReply {
  ok?: boolean
  message?: string
  code?: string
  trashedCount?: number
  archivedCount?: number
  failedCount?: number
  childCount?: number
}

async function postRecycleBin(body: Record<string, unknown>): Promise<RecycleBinReply> {
  const path = new URL(RECYCLE_BIN_ROUTE, document.baseURI).pathname
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  let payload: RecycleBinReply = {}
  try {
    payload = await response.json() as RecycleBinReply
  } catch {
    throw new Error(`回收站接口返回 HTTP ${response.status}`)
  }
  if (payload.ok !== true) throw new Error(payload.message ?? `回收站拒绝了请求（HTTP ${response.status}）`)
  return payload
}

/** Move sessions into the recycle bin (via dsh-recycle-bin). Returns how many. */
export async function trashSessions(sessionIds: readonly string[]): Promise<number> {
  const ids = [...sessionIds]
  if (ids.length === 0) return 0
  const reply = ids.length === 1
    ? await postRecycleBin({ action: 'trash', sessionId: ids[0] })
    : await postRecycleBin({ action: 'trashMany', sessionIds: ids })
  return reply.trashedCount ?? ids.length
}

/** Archive sessions through the shipped workspace service. Returns how many. */
export async function archiveSessions(sessionIds: readonly string[]): Promise<number> {
  const ui = uiWorkspaceService()
  if (ui === undefined || typeof ui.archiveSession !== 'function') {
    throw new Error('这个构建没有暴露归档接口')
  }
  let done = 0
  for (const sessionId of sessionIds) {
    await ui.archiveSession(sessionId, { stopActivity: true })
    done += 1
  }
  return done
}

/** Flip the shipped pin (the sidebar's own 置顶). */
export async function setPinned(sessionId: string, pinned: boolean): Promise<void> {
  const ui = uiWorkspaceService()
  const call = pinned ? ui?.pinSession : ui?.unpinSession
  if (ui === undefined || typeof call !== 'function') {
    throw new Error('这个构建没有暴露置顶接口')
  }
  await call.call(ui, sessionId)
}
