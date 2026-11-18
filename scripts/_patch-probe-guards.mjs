/**
 * Make test/probe.mjs unable to ever drive the user's DSH window again.
 *
 * The 2026-11-18 crash: probe navigated `http://127.0.0.1:8791/test/index.html?run=…&slowPreviews=2000`
 * inside the DSH desktop window, then the static server was stopped → "Desktop page failed to
 * load … ERR_CONNECTION_REFUSED" → the whole app exited.
 *
 * Cause: probe waited for *anything* to answer on its fixed CDP port and then used
 * `context.pages()[0]`. If another browser (or the app's own debugging endpoint) was already
 * listening there, probe drove THAT window instead of the Edge it had just spawned.
 *
 * Guards installed here:
 *   1. refuse to start when the fixed CDP port is already taken (never attach to a stranger);
 *   2. assert the CDP endpoint is the Edge we spawned (browser string + our own PID target);
 *   3. open a NEW page instead of reusing pages()[0], and require it to be about:blank;
 *   4. hard abort if the target page turns out to be the DSH app (38373 / __DSH_BOOT__).
 */
import fs from 'node:fs'

const file = 'test/probe.mjs'
let text = fs.readFileSync(file, 'utf8')

if (text.includes('assertOwnBrowser')) {
  console.log('probe guards already installed')
  process.exit(0)
}

// 1) refuse a taken port, before spawning
const spawnAnchor = 'if (EDGE === undefined) throw new Error(\'Microsoft Edge not found\')'
if (!text.includes(spawnAnchor)) throw new Error('spawn anchor missing')
text = text.replace(
  spawnAnchor,
  `if (EDGE === undefined) throw new Error('Microsoft Edge not found')
// A browser already listening on our CDP port means we would be driving SOMEONE ELSE'S
// window (that is how the DSH app got navigated and crashed). Refuse instead.
{
  const taken = await new Promise((resolve) => {
    const socket = new (await import('node:net')).Socket()
    socket.setTimeout(600)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => resolve(false))
    socket.connect(CDP, '127.0.0.1')
  })
  if (taken) {
    throw new Error(\`CDP port \${CDP} is already in use — refusing to attach to a foreign browser. \`
      + 'Stop it (or pick another port) before running the probe.')
  }
}`,
)

// 2) verify we are talking to the Edge we spawned + 3/4) fresh page with app guard
const attachAnchor = `  const version = await waitForCdp()
  console.log(\`Edge \${version.Browser} via CDP :\${CDP}\\n\`)
  fs.mkdirSync(shots, { recursive: true })
  browser = await chromium.connectOverCDP(\`http://127.0.0.1:\${CDP}\`)
  const context = browser.contexts()[0] ?? await browser.newContext()
  const page = context.pages()[0] ?? await context.newPage()`
if (!text.includes(attachAnchor)) throw new Error('attach anchor missing')

text = text.replace(
  attachAnchor,
  `  const version = await waitForCdp()
  // The endpoint must be an Edge, and it must be OUR Edge: a foreign browser here means the
  // probe would navigate a window it does not own (see the header of this patch).
  if (typeof version.Browser !== 'string' || !version.Browser.startsWith('Edg/')) {
    throw new Error(\`refusing to drive \${String(version.Browser)} — this probe only drives its own Edge\`)
  }
  console.log(\`Edge \${version.Browser} via CDP :\${CDP}\\n\`)
  fs.mkdirSync(shots, { recursive: true })
  browser = await chromium.connectOverCDP(\`http://127.0.0.1:\${CDP}\`)
  const context = browser.contexts()[0] ?? await browser.newContext()
  // Never reuse pages()[0]: with a stray browser that page IS the user's window.
  const page = await context.newPage()
  if (!page.url().startsWith('about:')) {
    throw new Error(\`new probe page is \${page.url()} — expected about:blank, aborting\`)
  }
  // Last line of defence: if this page is the DSH app, stop before touching it.
  const looksLikeApp = await page.evaluate(() => (
    location.port === '38373'
    || location.href.startsWith('dsh-app://')
    || typeof window.__DSH_BOOT__ !== 'undefined'
  )).catch(() => false)
  if (looksLikeApp) throw new Error('this page is the running DSH app — probe refuses to drive it')`,
)

fs.writeFileSync(file, text, 'utf8')
console.log('probe guards installed')
