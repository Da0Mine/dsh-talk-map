/**
 * Delete must actually delete.
 *
 * The recycle bin refuses while a session still has work (`session-open`: a
 * running turn, a queued message, a live subagent). That is the correct host
 * rule, but a card in the map is usually idle-looking yet still has an opened
 * Agent, so the plain delete just bounced.
 *
 * When the refusal is `session-open`, this asks the shell to stop that work
 * (the shipped `archiveSession(id, { stopActivity: true })` — the same switch the
 * sidebar's archive dialog uses) and retries the move a few times while the
 * stops settle. Anything else is surfaced unchanged.
 */
import fs from 'node:fs'

const file = 'src/client/session-actions.ts'
let source = fs.readFileSync(file, 'utf8')

const old = `/** Move sessions into the recycle bin (via dsh-recycle-bin). Returns how many. */
export async function trashSessions(sessionIds: readonly string[]): Promise<number> {
  const ids = [...sessionIds]
  if (ids.length === 0) return 0
  const reply = ids.length === 1
    ? await postRecycleBin({ action: 'trash', sessionId: ids[0] })
    : await postRecycleBin({ action: 'trashMany', sessionIds: ids })
  return reply.trashedCount ?? ids.length
}`

const next = `/** How many attempts (and how long apart) to let the stops settle. */
const STOP_RETRIES = 10
const STOP_RETRY_DELAY_MS = 400

/** True when the bin refused because the session still holds work. */
function isBusyRefusal(error: unknown): boolean {
  const message = String((error as Error | undefined)?.message ?? error)
  return message.includes('still has work')
    || message.includes('session-open')
    || message.includes('still active')
}

/** Ask the shell to stop a session's work (turn, jobs, subagents, schedules). */
async function stopWork(sessionIds: readonly string[]): Promise<void> {
  const ui = uiWorkspaceService()
  if (ui === undefined || typeof ui.archiveSession !== 'function') return
  for (const sessionId of sessionIds) {
    // stopActivity asks the host to cancel the running work instead of refusing;
    // the archive write lands immediately and the stops settle in the background.
    await ui.archiveSession(sessionId, { stopActivity: true }).catch(() => {})
  }
}

/**
 * Move sessions into the recycle bin (via dsh-recycle-bin). Returns how many.
 *
 * A session that is still running is stopped first and then moved — the card's
 * 删除 means "get rid of this", not "tell me it is busy".
 */
export async function trashSessions(sessionIds: readonly string[]): Promise<number> {
  const ids = [...sessionIds]
  if (ids.length === 0) return 0
  const attempt = async (): Promise<number> => {
    const reply = ids.length === 1
      ? await postRecycleBin({ action: 'trash', sessionId: ids[0] })
      : await postRecycleBin({ action: 'trashMany', sessionIds: ids })
    return reply.trashedCount ?? ids.length
  }
  try {
    return await attempt()
  } catch (error) {
    if (!isBusyRefusal(error)) throw error
    await stopWork(ids)
    let last = error
    for (let round = 0; round < STOP_RETRIES; round += 1) {
      await new Promise(resolve => setTimeout(resolve, STOP_RETRY_DELAY_MS))
      try {
        return await attempt()
      } catch (retryError) {
        last = retryError
        if (!isBusyRefusal(retryError)) throw retryError
      }
    }
    throw last
  }
}`

if (!source.includes(old)) {
  console.error('trashSessions block not found')
  process.exit(1)
}
source = source.replace(old, next)
fs.writeFileSync(file, source, 'utf8')
console.log('trashSessions: stop-then-retry')
