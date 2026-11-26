import fs from 'node:fs'
const f = 'src/host/origin.ts'
let t = fs.readFileSync(f, 'utf8')
const start = t.indexOf('export function sameOrigin')
const next = t.slice(start)
t = t.slice(0, start) + `export function sameOrigin(headers: { host?: string | undefined; origin?: string | undefined }): boolean {
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
`
fs.writeFileSync(f, t, 'utf8')
console.log('sameOrigin: 先判 Origin 再判 Host')
