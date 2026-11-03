import fs from 'node:fs'
const file = 'src/client/session-actions.ts'
let text = fs.readFileSync(file, 'utf8')

// Probe whether the recycle bin plugin answers at all. The Host answers 405 for an
// unknown non-GET path and 404 for an unknown GET; a registered route answers 200 or 401.
text = text.replace(
  "/** How many attempts (and how long apart) to let the stops settle. */",
  `/**
 * Is a recycle bin installed and answering? Its route is registered by the plugin, so a
 * missing plugin shows up as 404/405 on this path — that is the only signal there is.
 */
export async function recycleBinReady(): Promise<boolean> {
  try {
    const path = new URL(RECYCLE_BIN_ROUTE, document.baseURI).pathname
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'list' }),
      cache: 'no-store',
    })
    return response.status !== 404 && response.status !== 405
  } catch {
    return false
  }
}

/** How many attempts (and how long apart) to let the stops settle. */`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('recycleBinReady added')
