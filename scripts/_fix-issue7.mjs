import fs from 'node:fs'
const f = 'src/host/routes.ts'
let t = fs.readFileSync(f, 'utf8')
const before = `function sameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin
  if (origin === undefined) return true // curl / same-machine tooling
  const host = request.headers.host
  if (host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}`
const after = `/**
 * Only names that mean "this machine" are accepted. Comparing the Origin host with the Host
 * header proves nothing: under DNS rebinding the attacking page chooses both (issue #7), so
 * evil.example rebinding to 127.0.0.1 would send Host: evil.example:3080 and
 * Origin: http://evil.example:3080 and pass. The Host itself must be a loopback name.
 */
const LOOPBACK_NAMES = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

function hostName(value: string): string | undefined {
  try {
    // The Host header has no scheme; http:// is only there to satisfy the parser.
    return new URL(value.includes('://') ? value : \`http://\${value}\`).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

function isLoopback(value: string | undefined): boolean {
  if (value === undefined) return false
  if (LOOPBACK_NAMES.has(value)) return true
  // 127.0.0.0/8 is all loopback.
  return /^127\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$/.test(value)
}

function sameOrigin(request: IncomingMessage): boolean {
  const host = request.headers.host
  if (host === undefined) return false
  // DNS rebinding reaches the loopback listener with the attacker's hostname in Host: refuse it.
  if (!isLoopback(hostName(host))) return false
  const origin = request.headers.origin
  if (origin === undefined) return true // curl / same-machine tooling
  // The desktop shell serves the client from its own scheme.
  if (origin.startsWith('dsh-app://')) return true
  return isLoopback(hostName(origin))
}`
if (!t.includes(before)) throw new Error('sameOrigin anchor missing')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('sameOrigin: 改为仅接受回环 Host/Origin')
