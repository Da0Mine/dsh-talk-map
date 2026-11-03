import fs from 'node:fs'
const file = 'src/client/session-actions.ts'
let text = fs.readFileSync(file, 'utf8')
if (!text.includes("import { callRpc }")) {
  text = text.replace(/^(import .*\n)/, "$1import { callRpc } from './rpc.ts'\n")
}
text += String.raw`

/**
 * The Host's own delete, not the recycle-bin plugin's: \`session/delete\` is the endpoint
 * the app itself uses (AGENT_METHODS.session_delete). It removes the conversation for good
 * — nothing lands in a bin, so the caller must confirm first.
 */
export async function deleteSessionsDirect(sessionIds: readonly string[]): Promise<void> {
  let firstFailure: string | undefined
  for (const sessionId of sessionIds) {
    try {
      await callRpc('session/delete', { sessionId })
    } catch (error) {
      firstFailure ??= (error as Error).message
    }
  }
  if (firstFailure !== undefined) throw new Error(firstFailure)
}

/** \`workspaceController.deleteWorkspace\` — drops the registration, keeps files/sessions. */
export async function deleteWorkspaceRegistration(workspaceId: string): Promise<void> {
  try {
    await callRpc('workspace/delete', { workspaceId })
  } catch {
    // The registration may already be gone (or the id was never registered); the board
    // cleanup below still has to happen, so a missing registration is not an error here.
  }
}
`
fs.writeFileSync(file, text, 'utf8')
console.log('direct delete helpers added')
