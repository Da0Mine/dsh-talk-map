/**
 * Origin/Host gate for the mutating /talk-map/* routes.
 *
 * Comparing the Origin host with the Host header proves nothing: under DNS rebinding the
 * attacking page chooses both (issue #7), so evil.example rebinding to 127.0.0.1 would send
 * Host: evil.example:3080 together with Origin: http://evil.example:3080 and pass the old check.
 * The Host itself therefore has to name this machine.
 */
const LOOPBACK_NAMES = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

export function hostName(value: string): string | undefined {
  try {
    // The Host header carries no scheme; http:// only satisfies the parser.
    return new URL(value.includes('://') ? value : `http://${value}`).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

export function isLoopback(value: string | undefined): boolean {
  if (value === undefined) return false
  if (LOOPBACK_NAMES.has(value)) return true
  // 127.0.0.0/8 is all loopback.
  return /^127\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(value)
}

export function sameOrigin(headers: { host?: string | undefined; origin?: string | undefined }): boolean {
  const host = headers.host
  if (host === undefined) return false
  const name = hostName(host)
  const loopback = isLoopback(name)
  const from = headers.origin
  // No Origin: same-machine tooling (curl, scripts). The Host still has to be loopback.
  if (from === undefined) return loopback
  // The desktop shell serves the client from its own scheme; some builds proxy those requests
  // through the custom-protocol handler, where Host is the scheme's own authority ("app").
  if (from.startsWith('dsh-app://')) return loopback || name === 'app'
  // A page from elsewhere (including DNS rebinding, where Host carries the attacker's name).
  if (!loopback) return false
  return isLoopback(hostName(from))
}
